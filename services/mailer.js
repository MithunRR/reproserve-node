/**
 * Thin wrapper around Nodemailer so the rest of the app doesn't depend on a
 * specific transport. Swapping Gmail SMTP for Brevo/Resend/SES later means
 * changing this one file — call sites stay identical.
 */
const nodemailer = require('nodemailer');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const FROM_NAME  = process.env.EMAIL_FROM_NAME || 'ReproServe';

let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error('EMAIL_USER and EMAIL_PASS must be set in .env');
  }

  // Gmail App Passwords arrive copy-pasted with spaces every 4 chars.
  // Strip them — Google's SMTP rejects the spaced version.
  const pass = EMAIL_PASS.replace(/\s+/g, '');

  cachedTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_USER, pass }
  });

  return cachedTransporter;
}

async function sendMail({ to, subject, html, text }) {
  const transporter = getTransporter();
  return transporter.sendMail({
    from: `"${FROM_NAME}" <${EMAIL_USER}>`,
    to, subject, html, text
  });
}

// Pre-baked template for the signup verification link. Minimal + inline-styled
// so it renders well in Gmail/Outlook/Apple Mail without external CSS.
function verificationEmailTemplate({ link, firstName, hours }) {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const subject = 'Verify your ReproServe account';
  const text =
    `${greeting}\n\n` +
    `Welcome to ReproServe! Please verify your email address by clicking the link below:\n\n` +
    `${link}\n\n` +
    `This link expires in ${hours} hours.\n\n` +
    `If you didn't sign up for ReproServe, you can safely ignore this email.`;
  const html = `
<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6eaf0;">
        <tr><td style="background:linear-gradient(135deg,#004571,#0089e1);padding:24px 32px;color:#ffffff;">
          <div style="font-size:20px;font-weight:700;letter-spacing:0.3px;">ReproServe</div>
          <div style="font-size:13px;opacity:.85;margin-top:2px;">Welcome aboard</div>
        </td></tr>
        <tr><td style="padding:32px;color:#253147;">
          <p style="margin:0 0 12px 0;font-size:15px;line-height:1.55;">${greeting}</p>
          <p style="margin:0 0 20px 0;font-size:15px;line-height:1.55;">
            Thanks for signing up for ReproServe. Please confirm your email address
            so we can finish setting up your account.
          </p>
          <div style="text-align:center;margin:28px 0;">
            <a href="${link}" target="_blank"
               style="display:inline-block;background:#ffd200;color:#253147;text-decoration:none;
                      font-weight:700;font-size:15px;padding:14px 28px;border-radius:10px;
                      border:1px solid #e6c200;">
              Verify Email Address
            </a>
          </div>
          <p style="margin:0 0 8px 0;font-size:13px;color:#5b6473;">
            Or paste this link into your browser:
          </p>
          <p style="margin:0 0 16px 0;font-size:12px;color:#0089e1;word-break:break-all;">
            ${link}
          </p>
          <p style="margin:0;font-size:13px;color:#5b6473;">
            This link expires in <strong>${hours} hours</strong>.
          </p>
          <p style="margin:24px 0 0 0;font-size:12px;color:#8b94a3;line-height:1.5;">
            If you didn't create a ReproServe account, you can safely ignore this email —
            someone may have typed your address by mistake.
          </p>
        </td></tr>
        <tr><td style="background:#f5f7fa;padding:16px 32px;font-size:11px;color:#8b94a3;text-align:center;">
          © ReproServe · This is an automated message, please do not reply.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim();
  return { subject, html, text };
}

// Admin notification email — fired when a visitor submits the Contact form.
// Renders the full message + a quick "Reply" button (mailto) so admins can
// respond straight from their inbox.
function contactMessageEmailTemplate({ name, email, phone, subject, userType, message, submittedAt }) {
  const safeName    = String(name    || 'A visitor').slice(0, 200);
  const safeEmail   = String(email   || '').slice(0, 200);
  const safePhone   = phone ? String(phone).slice(0, 50) : '';
  const safeSubject = subject || '—';
  const safeType    = userType || '—';
  const when        = submittedAt ? new Date(submittedAt).toLocaleString() : new Date().toLocaleString();
  const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);

  const subjectLine = `[ReproServe] New contact message from ${safeName}`;
  const text =
    `New contact message via ReproServe\n\n` +
    `From:    ${safeName} <${safeEmail}>\n` +
    (safePhone ? `Phone:   ${safePhone}\n` : '') +
    `Subject: ${safeSubject}\n` +
    `I am a:  ${safeType}\n` +
    `When:    ${when}\n\n` +
    `Message:\n${message}\n\n` +
    `Reply directly: mailto:${safeEmail}?subject=Re:%20${encodeURIComponent(safeSubject)}\n`;

  const html = `
<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6eaf0;">
        <tr><td style="background:linear-gradient(135deg,#004571,#0089e1);padding:24px 32px;color:#ffffff;">
          <div style="font-size:20px;font-weight:700;letter-spacing:0.3px;">ReproServe</div>
          <div style="font-size:13px;opacity:.85;margin-top:2px;">New contact message</div>
        </td></tr>
        <tr><td style="padding:24px 32px;color:#253147;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">
            <tr>
              <td style="padding:6px 0;color:#5b6473;width:90px;">From</td>
              <td style="padding:6px 0;font-weight:600;">${esc(safeName)}
                &nbsp;<a href="mailto:${esc(safeEmail)}" style="color:#0089e1;text-decoration:none;">&lt;${esc(safeEmail)}&gt;</a></td>
            </tr>
            ${safePhone ? `
            <tr>
              <td style="padding:6px 0;color:#5b6473;">Phone</td>
              <td style="padding:6px 0;"><a href="tel:${esc(safePhone)}" style="color:#0089e1;text-decoration:none;">${esc(safePhone)}</a></td>
            </tr>` : ''}
            <tr>
              <td style="padding:6px 0;color:#5b6473;">Subject</td>
              <td style="padding:6px 0;">${esc(safeSubject)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#5b6473;">I am a</td>
              <td style="padding:6px 0;text-transform:capitalize;">${esc(safeType)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#5b6473;">Received</td>
              <td style="padding:6px 0;">${esc(when)}</td>
            </tr>
          </table>
          <div style="margin-top:18px;padding-top:16px;border-top:1px solid #e6eaf0;">
            <div style="font-size:12px;color:#5b6473;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Message</div>
            <div style="font-size:14px;line-height:1.6;color:#253147;white-space:pre-line;">${esc(message)}</div>
          </div>
          <div style="text-align:center;margin-top:24px;">
            <a href="mailto:${esc(safeEmail)}?subject=Re:%20${encodeURIComponent(safeSubject)}"
               style="display:inline-block;background:#ffd200;color:#253147;text-decoration:none;
                      font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;
                      border:1px solid #e6c200;">
              Reply to ${esc(safeName)}
            </a>
          </div>
        </td></tr>
        <tr><td style="background:#f5f7fa;padding:14px 32px;font-size:11px;color:#8b94a3;text-align:center;">
          You're receiving this because you are an admin on ReproServe.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim();
  return { subject: subjectLine, html, text };
}

module.exports = { sendMail, verificationEmailTemplate, contactMessageEmailTemplate };
