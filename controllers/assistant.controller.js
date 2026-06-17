const { runAssistant } = require('../services/assistant/engine');

// POST /api/assistant
// Body: { message, history?: [{ role, text }], context?: { city, state, lat, lng } }
// Public — no auth required, but the client may pass a logged-in user's city/
// coordinates as `context` to power "near me" / "in my area" answers.
exports.chat = async (req, res) => {
  try {
    const { message, history, context } = req.body || {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, message: 'A message is required.' });
    }
    if (message.length > 1000) {
      return res.status(400).json({ success: false, message: 'Message is too long.' });
    }

    const result = await runAssistant({
      message: message.trim(),
      // Keep only the last 10 turns to bound token usage on the free tier.
      history: Array.isArray(history) ? history.slice(-10) : [],
      context: context && typeof context === 'object' ? context : {}
    });

    return res.status(200).json({ success: true, reply: result.reply });
  } catch (err) {
    console.error('[assistant] error:', err.message);
    return res.status(200).json({
      success: false,
      reply: "Sorry, I'm having trouble right now. Please try again in a moment."
    });
  }
};
