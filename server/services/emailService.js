import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Resolve environment files across both root and server directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, '../../.env');
const serverEnvPath = path.resolve(__dirname, '../.env');

dotenv.config({ path: rootEnvPath });
dotenv.config({ path: serverEnvPath });

/**
 * Custom error class for email delivery failures.
 */
export class EmailServiceError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'EmailServiceError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Retrieves Resend configuration safely from environment variables.
 */
function getEmailCredentials() {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const from = (
    process.env.EMAIL_FROM || 'ClosetBrain <onboarding@resend.dev>'
  ).trim();

  return { apiKey, from };
}

/**
 * Checks whether Resend credentials are configured.
 *
 * @returns {boolean}
 */
export function isEmailConfigured() {
  const { apiKey } = getEmailCredentials();
  return Boolean(
    apiKey &&
      !apiKey.includes('<') &&
      !apiKey.includes('your_resend_api_key') &&
      apiKey.startsWith('re_')
  );
}

/**
 * Returns safe status object without exposing sensitive API key values.
 *
 * @returns {{ configured: boolean, from: string }}
 */
export function getSafeEmailStatus() {
  const { from } = getEmailCredentials();
  return {
    configured: isEmailConfigured(),
    from,
  };
}

/**
 * Masks an email address for safe logging (e.g. "el***@example.com").
 *
 * @param {string} email
 * @returns {string}
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string') return '***';
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const [local, domain] = parts;
  const visible = local.length > 2 ? local.slice(0, 2) : local.slice(0, 1);
  return `${visible}***@${domain}`;
}

/**
 * Generates editorial HTML and text markup for ClosetBrain transactional emails.
 */
function buildEmailTemplate({ title, heading, recipientName, message, otp, expiresInMinutes }) {
  const greeting = recipientName ? `Hello ${recipientName},` : 'Hello,';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FDFBF7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #23201D;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FDFBF7; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #FFFFFF; border: 1px solid #ECE5DA; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 20px rgba(91, 25, 36, 0.04);">
          <!-- Header Bar -->
          <tr>
            <td style="padding: 32px 36px 20px 36px; text-align: center; border-bottom: 1px solid #F2ECE1;">
              <div style="display: inline-block; width: 42px; height: 42px; line-height: 42px; background-color: #5B1924; color: #FDFBF7; font-size: 16px; font-weight: bold; border-radius: 12px; margin-bottom: 12px;">CB</div>
              <h1 style="margin: 0; font-family: 'Georgia', serif; font-size: 24px; font-weight: 600; color: #1C1817; letter-spacing: -0.02em;">Closet<span style="color: #5B1924; font-style: italic;">Brain</span></h1>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 36px;">
              <h2 style="margin: 0 0 14px 0; font-family: 'Georgia', serif; font-size: 20px; font-weight: 600; color: #1C1817;">${heading}</h2>
              <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #5C554E;">${greeting}</p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #5C554E;">${message}</p>

              <!-- OTP Display Box -->
              <div style="background-color: #FAF6EE; border: 1px solid #ECE5DA; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <div style="font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #8C8379; margin-bottom: 8px;">Verification Code</div>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 700; letter-spacing: 0.25em; color: #5B1924; padding-left: 0.25em;">${otp}</div>
                <div style="font-size: 11px; color: #8C8379; margin-top: 8px;">Valid for ${expiresInMinutes} minutes • Do not share this code</div>
              </div>

              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #8C8379;">If you did not make this request, you can safely disregard this email. Your ClosetBrain account remains secure.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px 28px 36px; background-color: #FAF6EE; border-top: 1px solid #F2ECE1; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #8C8379;">ClosetBrain — Intelligent Digital Wardrobe & Styling</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `ClosetBrain — Digital Wardrobe

${heading}

${greeting}

${message}

YOUR VERIFICATION CODE:
${otp}

This code will expire in ${expiresInMinutes} minutes.
If you did not request this code, no further action is required.`;

  return { html, text };
}

/**
 * Sends an email using Resend's REST API and Node's native fetch.
 *
 * @param {object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.subject - Subject line
 * @param {string} params.html - HTML body
 * @param {string} [params.text] - Plaintext alternative
 * @param {string} [params.otp] - For dev-only fallback inspection (strictly impossible in production)
 * @param {string} [params.purpose] - Action purpose (signup_verification or password_reset)
 * @returns {Promise<{ success: boolean, messageId: string, devFallback: boolean }>}
 */
export async function sendEmail({ to, subject, html, text, otp = null, purpose = 'authentication' }) {
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    throw new EmailServiceError('Invalid recipient email address.', 400);
  }

  const { apiKey, from } = getEmailCredentials();
  const isProd = process.env.NODE_ENV === 'production';

  // If API key is missing
  if (!apiKey) {
    if (!isProd) {
      console.warn(
        `\n⚠️ [DEV EMAIL FALLBACK] RESEND_API_KEY is not configured. Falling back to local console delivery:`
      );
      console.log(`🔑 [DEV EMAIL] Purpose: ${purpose}`);
      console.log(`📧 [DEV EMAIL] Recipient: ${maskEmail(to)}`);
      if (otp) console.log(`🔢 [DEV EMAIL OTP]: ${otp}`);
      console.log(`======================================================\n`);
      return { success: true, messageId: 'dev-fallback-missing-key', devFallback: true };
    }
    throw new EmailServiceError('Email delivery service is not configured.', 500);
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data?.message || `Resend API returned status ${res.status}`;

      // Check for Resend sandbox test domain restriction:
      // "You can only send testing emails to your own email address..."
      const isSandboxRestriction =
        res.status === 403 &&
        typeof errorMsg === 'string' &&
        errorMsg.toLowerCase().includes('only send testing emails to your own email');

      if (!isProd && isSandboxRestriction) {
        console.warn(
          `\n⚠️ [DEV EMAIL FALLBACK] Resend free sandbox restricted delivery to external address "${maskEmail(to)}":`
        );
        console.log(`🔑 [DEV EMAIL] Purpose: ${purpose}`);
        console.log(`📧 [DEV EMAIL] Recipient: ${maskEmail(to)}`);
        if (otp) console.log(`🔢 [DEV EMAIL OTP]: ${otp}`);
        console.log(`======================================================\n`);
        return { success: true, messageId: 'dev-fallback-sandbox-restriction', devFallback: true };
      }

      throw new EmailServiceError(
        isProd ? 'Failed to deliver email. Please try again later.' : errorMsg,
        res.status,
        data
      );
    }

    return {
      success: true,
      messageId: data.id,
      devFallback: false,
    };
  } catch (err) {
    if (err instanceof EmailServiceError) {
      throw err;
    }

    if (!isProd) {
      console.warn(
        `\n⚠️ [DEV EMAIL FALLBACK] Network failure reaching Resend API: ${err.message}`
      );
      if (otp) console.log(`🔢 [DEV EMAIL OTP]: ${otp}`);
      console.log(`======================================================\n`);
      return { success: true, messageId: 'dev-fallback-network-error', devFallback: true };
    }

    throw new EmailServiceError('Email delivery failed due to a network or provider error.', 502);
  }
}

/**
 * Sends a signup email verification OTP.
 *
 * @param {object} params
 * @param {string} params.to - Recipient email
 * @param {string} [params.name] - User name
 * @param {string} params.otp - 6-digit OTP code
 * @param {number} [params.expiresInMinutes=10]
 * @returns {Promise<{ success: boolean, messageId: string, devFallback: boolean }>}
 */
export async function sendSignupVerificationEmail({ to, name = '', otp, expiresInMinutes = 10 }) {
  if (!otp || typeof otp !== 'string') {
    throw new EmailServiceError('A valid verification code is required.', 400);
  }

  const { html, text } = buildEmailTemplate({
    title: 'Verify your ClosetBrain account',
    heading: 'Verify Your Email Address',
    recipientName: name,
    message:
      'Thank you for creating an account with ClosetBrain. Please enter the following 6-digit verification code to confirm your email and access your wardrobe studio.',
    otp,
    expiresInMinutes,
  });

  return await sendEmail({
    to,
    subject: `${otp} is your ClosetBrain verification code`,
    html,
    text,
    otp,
    purpose: 'signup_verification',
  });
}

/**
 * Sends a password reset OTP.
 *
 * @param {object} params
 * @param {string} params.to - Recipient email
 * @param {string} [params.name] - User name
 * @param {string} params.otp - 6-digit OTP code
 * @param {number} [params.expiresInMinutes=10]
 * @returns {Promise<{ success: boolean, messageId: string, devFallback: boolean }>}
 */
export async function sendPasswordResetEmail({ to, name = '', otp, expiresInMinutes = 10 }) {
  if (!otp || typeof otp !== 'string') {
    throw new EmailServiceError('A valid password reset code is required.', 400);
  }

  const { html, text } = buildEmailTemplate({
    title: 'Reset your ClosetBrain password',
    heading: 'Reset Your Password',
    recipientName: name,
    message:
      'We received a request to reset the password for your ClosetBrain account. Enter the verification code below to proceed with setting a new password.',
    otp,
    expiresInMinutes,
  });

  return await sendEmail({
    to,
    subject: `${otp} is your ClosetBrain password reset code`,
    html,
    text,
    otp,
    purpose: 'password_reset',
  });
}

export default {
  sendEmail,
  sendSignupVerificationEmail,
  sendPasswordResetEmail,
  isEmailConfigured,
  getSafeEmailStatus,
  maskEmail,
  EmailServiceError,
};
