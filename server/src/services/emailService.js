const nodemailer = require('nodemailer');
const env = require('../config/env');

// In-memory record for testing purposes
let lastDispatchedEmailForTesting = null;

/**
 * Checks whether an email transport provider is configured in environment variables.
 */
function isEmailConfigured() {
  if (process.env.RESEND_API_KEY) return true;
  if (process.env.SENDGRID_API_KEY) return true;
  if (process.env.SMTP_HOST && (process.env.SMTP_USER || process.env.SMTP_PASS)) return true;
  return false;
}

/**
 * Get configured transporter or provider name.
 */
function getProviderName() {
  if (process.env.RESEND_API_KEY) return 'Resend API';
  if (process.env.SENDGRID_API_KEY) return 'SendGrid API';
  if (process.env.SMTP_HOST) return `SMTP (${process.env.SMTP_HOST})`;
  return 'None (Simulated / Unconfigured)';
}

/**
 * Sends a password reset email using the configured provider.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.name - Recipient user name
 * @param {string} options.resetUrl - Full secure password reset link
 * @returns {Promise<Object>} Delivery result
 */
async function sendPasswordResetEmail({ to, name = 'SwiftFleet User', resetUrl }) {
  if (!to || !resetUrl) {
    throw new Error('Recipient email and reset URL are required.');
  }

  // Record for test assertions in non-production environments
  if (env.NODE_ENV !== 'production') {
    lastDispatchedEmailForTesting = {
      to,
      name,
      resetUrl,
      timestamp: new Date()
    };
  }

  const fromAddress = process.env.EMAIL_FROM || 'SwiftFleet Security <no-reply@swiftfleet.io>';
  const subject = 'Reset Your SwiftFleet Password';

  const textContent = `Hello ${name},

We received a request to reset your password for your SwiftFleet account.

Click the link below to set a new password (valid for 15 minutes):
${resetUrl}

If you did not request this password reset, please ignore this email or reach out to security support. Your password will remain unchanged.

Best regards,
The SwiftFleet Team`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .brand { font-size: 18px; font-weight: 800; color: #0284c7; letter-spacing: -0.5px; margin-bottom: 24px; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #0f172a; }
    p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .btn { display: inline-block; background-color: #0284c7; color: #ffffff !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 10px; margin: 16px 0 24px 0; }
    .footer { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 24px; }
    .expiry { background: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1; padding: 10px 14px; border-radius: 8px; font-size: 12px; font-weight: 500; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">⚡ SwiftFleet Operations</div>
    <h1>Password Reset Request</h1>
    <p>Hello ${name},</p>
    <p>We received a request to reset the password associated with your SwiftFleet account. Click the button below to choose a new password:</p>
    
    <div style="text-align: center;">
      <a href="${resetUrl}" class="btn" target="_blank" rel="noopener noreferrer">Reset My Password</a>
    </div>

    <div class="expiry">
      ⏱️ This link is single-use and will expire in <strong>15 minutes</strong>.
    </div>

    <p style="font-size: 12px; color: #64748b;">
      If the button above does not work, copy and paste this secure link into your browser:<br>
      <span style="font-family: monospace; word-break: break-all; color: #0284c7;">${resetUrl}</span>
    </p>

    <div class="footer">
      If you did not request a password reset, no action is needed. Your account remains secure and your current password has not been changed.
    </div>
  </div>
</body>
</html>
  `.trim();

  // 1. Resend HTTP API
  if (process.env.RESEND_API_KEY) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [to],
          subject,
          text: textContent,
          html: htmlContent
        })
      });

      const resData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(resData.message || `Resend API failed with status ${response.status}`);
      }
      return { success: true, provider: 'Resend API', messageId: resData.id };
    } catch (err) {
      console.error('❌ [EmailService] Resend API dispatch error:', err.message);
      throw err;
    }
  }

  // 2. SendGrid HTTP API
  if (process.env.SENDGRID_API_KEY) {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: fromAddress.includes('<') ? fromAddress.match(/<([^>]+)>/)[1] : fromAddress },
          subject,
          content: [
            { type: 'text/plain', value: textContent },
            { type: 'text/html', value: htmlContent }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SendGrid API failed with status ${response.status}: ${errorText}`);
      }
      return { success: true, provider: 'SendGrid API' };
    } catch (err) {
      console.error('❌ [EmailService] SendGrid API dispatch error:', err.message);
      throw err;
    }
  }

  // 3. SMTP Transport via Nodemailer
  if (process.env.SMTP_HOST) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
        auth: process.env.SMTP_USER ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || ''
        } : undefined
      });

      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text: textContent,
        html: htmlContent
      });

      return { success: true, provider: 'SMTP', messageId: info.messageId };
    } catch (err) {
      console.error('❌ [EmailService] SMTP dispatch error:', err.message);
      throw err;
    }
  }

  // 4. Fallback when no live provider is configured
  if (env.NODE_ENV === 'production') {
    console.warn('⚠️ [EmailService] Production email provider is not configured. Email was not dispatched.');
    return {
      success: false,
      configured: false,
      provider: 'None',
      message: 'Email service is not configured on this server.'
    };
  }

  console.log(`ℹ️ [EmailService] Simulated password reset email to ${to} (Provider not configured in development).`);
  return {
    success: true,
    configured: false,
    provider: 'Simulated (Dev Mode)'
  };
}

function getLastDispatchedEmailForTesting() {
  return lastDispatchedEmailForTesting;
}

function clearLastDispatchedEmailForTesting() {
  lastDispatchedEmailForTesting = null;
}

module.exports = {
  isEmailConfigured,
  getProviderName,
  sendPasswordResetEmail,
  getLastDispatchedEmailForTesting,
  clearLastDispatchedEmailForTesting
};
