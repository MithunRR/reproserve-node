// ---------------------------------------------------------------------------
// Assistant engine — the "brain".
//
// Wraps a free-tier LLM (Google Gemini by default) with function-calling over
// the skills in ./skills.js. The LLM decides which skill to call; we run the
// real DB query and feed the result back so it answers from live data only.
//
// Provider is swappable via ASSISTANT_PROVIDER (currently 'gemini'). Gemini is
// called over its REST API with the built-in fetch — no SDK dependency.
//
//   .env knobs:
//     GEMINI_API_KEY    (required)   free key from aistudio.google.com
//     ASSISTANT_MODEL   (optional)   default 'gemini-2.5-flash'
// ---------------------------------------------------------------------------
const skills = require('./skills');
const { PLATFORM_HELP } = require('./help');

const API_KEY = (process.env.GEMINI_API_KEY || '').trim();
// flash-lite has the most generous free-tier daily quota and is plenty for
// this assistant. Override with ASSISTANT_MODEL (e.g. gemini-2.5-flash) if you
// enable billing or want a stronger model.
const MODEL = (process.env.ASSISTANT_MODEL || 'gemini-2.5-flash-lite').trim();
const MAX_TOOL_HOPS = 5;

// --- Tool catalogue exposed to the model ----------------------------------
const TOOL_DECLARATIONS = [
  {
    name: 'search_providers',
    description:
      'Find service providers or realtors on ReproServe. Use for questions about ' +
      'plumbers, electricians, cleaners, inspectors, realtors, top-rated or nearby ' +
      'providers, etc. Returns name, service, city, rating and review count.',
    parameters: {
      type: 'object',
      properties: {
        serviceType: {
          type: 'string',
          description: 'Service category to filter by, e.g. "Plumbing", "Inspection", "Cleaning".'
        },
        city: { type: 'string', description: 'City to search in.' },
        role: {
          type: 'string',
          enum: ['service_provider', 'realtor'],
          description: 'Restrict to service providers or realtors. Omit for both.'
        },
        minRating: {
          type: 'number',
          description: 'Only return providers with at least this average rating (0-5).'
        },
        nearMe: {
          type: 'boolean',
          description: "Set true for 'near me' / 'in my area' when the user is logged in; uses their saved location."
        },
        limit: { type: 'integer', description: 'Max results (1-10, default 5).' }
      }
    }
  },
  {
    name: 'search_open_houses',
    description:
      'Find current/upcoming open houses (real-estate listings). Expired ones are ' +
      'never returned. Use for questions about open houses or properties in an area.',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'City/area to search in.' },
        propertyType: { type: 'string', description: 'e.g. "Apartment", "House", "Condo".' },
        limit: { type: 'integer', description: 'Max results (1-10, default 5).' }
      }
    }
  },
  {
    name: 'list_service_types',
    description: 'List every service category ReproServe supports. Use when asked what services are offered.',
    parameters: { type: 'object', properties: {} }
  }
];

// --- Map a model tool-call to a real skill call ----------------------------
async function dispatch(name, args = {}, context = {}) {
  switch (name) {
    case 'search_providers': {
      const params = {
        serviceType: args.serviceType,
        city: args.city,
        role: args.role,
        minRating: args.minRating,
        limit: args.limit
      };
      // "near me" → use the logged-in user's geocoded location from context.
      if (args.nearMe && context.lat != null && context.lng != null) {
        params.nearLat = context.lat;
        params.nearLng = context.lng;
        params.radiusKm = context.radiusKm || 50;
      } else if (args.nearMe && context.city && !params.city) {
        params.city = context.city; // fall back to city when we have no coords
      }
      return skills.searchProviders(params);
    }
    case 'search_open_houses':
      return skills.searchOpenHouses({
        city: args.city,
        propertyType: args.propertyType,
        limit: args.limit
      });
    case 'list_service_types':
      return skills.listServiceTypes();
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

function buildSystemPrompt(context = {}) {
  const loc = [];
  if (context.city) loc.push(context.city);
  if (context.state) loc.push(context.state);
  const where = loc.length ? loc.join(', ') : null;

  return [
    'You are the ReproServe Assistant, a friendly guide on a home-services and',
    'real-estate marketplace. You help visitors find service providers (plumbers,',
    'electricians, cleaners, inspectors, etc.), realtors, and open houses, AND you',
    'explain how to use the platform (registering, listing a property, requesting a',
    'quote, RSVPing, etc.).',
    '',
    'You have two ways to answer:',
    '1. DATA questions (find/look up providers, realtors, open houses, services) →',
    '   call the tools; they return live data.',
    '2. HOW-TO / usage questions ("how do I…", "where do I…", "can I…") → answer',
    '   directly from the "HOW TO USE REPROSERVE" guide below. Give the actual steps',
    '   instantly — never tell the user to "visit the website" or "contact support".',
    '',
    'Rules:',
    '- For data, never invent providers, realtors, ratings, prices, phone numbers or',
    '  listings — only report what the tools return. If a tool returns nothing, say so',
    '  honestly and suggest a nearby city or related service.',
    '- Do not demand a city for general questions. For "top-rated/best providers" with',
    '  no place named, call the tool with no city and return the best-rated overall.',
    '  Only use location for explicit "near me" asks.',
    '- If a question combines both (e.g. "how do I register to show my property"),',
    '  give the relevant how-to steps from the guide.',
    '- Keep replies short and skimmable; use compact numbered steps or bullets.',
    '- Only steer back if a question is truly unrelated to ReproServe or home/real-estate services.',
    where
      ? `- The user's location is ${where}; use it for "near me" / "in my area" unless they name another place.`
      : '- The user has not shared a location; ask for a city if they say "near me".',
    '',
    PLATFORM_HELP
  ].join('\n');
}

// Normalise the front-end history into Gemini "contents".
function toContents(history = []) {
  return history
    .filter((m) => m && typeof m.text === 'string' && m.text.trim())
    .map((m) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text }]
    }));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callGemini(body) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  // 503 (model briefly overloaded) is worth a quick inline retry. 429 (rate
  // limit) is NOT — retrying just burns more quota and the reset is longer than
  // we'd wait inline — so fail fast and let the controller return a soft message.
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
      body: JSON.stringify(body)
    });
    if (resp.ok) return resp.json();

    const detail = await resp.text().catch(() => '');
    lastErr = new Error(`Gemini API ${resp.status}: ${detail.slice(0, 300)}`);
    lastErr.status = resp.status;
    if (resp.status !== 503) break; // only overloads are retried
    await sleep(800 * (attempt + 1));
  }
  throw lastErr;
}

// Run one user turn through the model, executing any tool calls it requests.
async function runAssistant({ message, history = [], context = {} }) {
  if (!API_KEY) {
    return { reply: "The assistant isn't configured yet. (Missing GEMINI_API_KEY.)", configured: false };
  }

  const systemInstruction = { parts: [{ text: buildSystemPrompt(context) }] };
  const tools = [{ functionDeclarations: TOOL_DECLARATIONS }];
  const contents = [...toContents(history), { role: 'user', parts: [{ text: message }] }];

  for (let hop = 0; hop < MAX_TOOL_HOPS; hop++) {
    const data = await callGemini({
      systemInstruction,
      contents,
      tools,
      generationConfig: { temperature: 0.3, maxOutputTokens: 800 }
    });

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const calls = parts.filter((p) => p.functionCall);

    if (calls.length) {
      // Record the model's tool-call turn, then answer each call with real data.
      contents.push({ role: 'model', parts });
      const responseParts = [];
      for (const p of calls) {
        let result;
        try {
          result = await dispatch(p.functionCall.name, p.functionCall.args || {}, context);
        } catch (e) {
          result = { error: e.message };
        }
        responseParts.push({
          functionResponse: { name: p.functionCall.name, response: { result } }
        });
      }
      contents.push({ role: 'user', parts: responseParts });
      continue;
    }

    const text = parts.filter((p) => typeof p.text === 'string').map((p) => p.text).join('\n').trim();
    return { reply: text || "Sorry, I couldn't find an answer to that." };
  }

  return { reply: "Sorry, that took too many steps — could you rephrase your question?" };
}

module.exports = { runAssistant };
