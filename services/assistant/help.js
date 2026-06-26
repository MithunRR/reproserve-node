// ---------------------------------------------------------------------------
// Platform how-to knowledge.
//
// Static, factual step-by-step guides for the main ReproServe flows, taken from
// the real UI (nav labels, button text, required fields). Injected into the
// assistant's system prompt so "how do I…" questions are answered instantly
// with correct steps instead of being deflected. Keep it concise — it costs
// tokens on every request. Update if the UI changes.
// ---------------------------------------------------------------------------

const PLATFORM_HELP = `HOW TO USE REPROSERVE — use these steps to answer "how do I…" questions.
Give the steps directly. Mention login requirements where noted.

CREATE AN ACCOUNT / SIGN UP (no login needed):
1. Click "Signup" (top-right of the header).
2. Pick an account type: User, Service Provider, or Realtor.
3. Service Providers/Realtors: choose "Register as" — Individual or Business.
4. Fill First Name, Last Name, Email, Phone, Password (min 6) + Confirm, Street Address, City, State, ZIP.
5. Business providers/realtors also add: Business Name, Service Type, Business Description, License Number (optional).
6. Click "Create Account", then open the verification link emailed to you (expires in 24h) to activate. Use "Resend Email" if it doesn't arrive.

SHOW MY PROPERTY (list your property for a realtor to show — login required):
1. Go to "Show My Property". If not logged in you'll be sent to login first.
2. Choose Property Type (Residential/Commercial); enter Property Title, Description, Address (required), Asking Price (optional), and Hourly Payout to Agent (required); optionally set Available From/To dates.
3. Upload up to 10 photos and an optional video (max 25MB).
4. Click "Post Property Listing". Realtors get notified; track it under Profile → My Showings.

FIND & CONTACT A SERVICE PROVIDER:
1. Open "Contractors" in the header (Find Providers).
2. Search by name, filter by Category / Location / rating, and sort.
3. Click "View Profile" on a provider to see Overview, Services, Portfolio and Reviews.
4. Click "Connect" to message them (login required) or "Request a Quote".

REQUEST A QUOTE (login required):
1. On a provider's profile, click "Request a Quote".
2. Fill the form (name/email/phone are pre-filled): Property Type, Category, Description, Budget Min/Max (optional), Location, and optional photos.
3. Click "Submit Quote Request".

CREATE AN OPEN HOUSE (login required; only Users and Realtors can):
1. Open "RealEstate Service" → "Open House" in the header, then click "Create Open House".
2. Fill Title, Property Type, Address, Description, Date & Time From/To, Max Attendees (optional), Listing Price (optional), and an optional photo.
3. Click "Create". It appears in the listings.

RSVP / ATTEND AN OPEN HOUSE:
1. Open the Open House page and click a listing to open its details.
2. Click "Attend" / "RSVP" (login required).
3. Fill Name, Email, Phone, and optionally arriving time, number of guests, special requests.
4. Click "Submit RSVP".`;

module.exports = { PLATFORM_HELP };
