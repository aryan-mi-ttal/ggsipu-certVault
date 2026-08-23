const nodemailer = require('nodemailer');
const path = require('path');

require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

/**
 * Creates and returns a Nodemailer transporter using direct Gmail SSL (Port 465) or TLS (Port 587).
 *
 * @param {number} port - SMTP Port (465 or 587)
 * @param {boolean} secure - Secure flag (true for 465, false for 587)
 */
function getEmailTransporter(port = 465, secure = true) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.warn('[EMAIL SERVICE] Missing GMAIL_USER or GMAIL_APP_PASSWORD in environment variables.');
    return null;
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: port,
    secure: secure,
    auth: {
      user: user.trim(),
      pass: pass.trim(),
    },
    tls: {
      rejectUnauthorized: false,
      servername: 'smtp.gmail.com',
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
}


/**
 * Sleep helper to introduce a delay (in ms) between operations.
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms = 500) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sends a certificate notification email to a student.
 * Uses Google Apps Script relay (HTTPS port 443) when available to bypass cloud SMTP port blocking,
 * and falls back to direct Gmail SSL (port 465).
 *
 * @param {Object} params
 * @param {string} params.name - Recipient student name
 * @param {string} params.email - Recipient email address
 * @param {string} params.cert_id - Unique Certificate ID
 * @param {string} params.pdf_url - Direct Google Drive or viewable PDF URL
 * @returns {Promise<Object>} Send info
 */
async function sendCertificateEmail(params = {}) {
  const name = params.name;
  const email = params.email;
  const certId = params.cert_id || params.certId || 'N/A';
  const pdfUrl = params.pdf_url || params.pdfUrl || '#';

  if (!email) {
    throw new Error(`Recipient email address is missing for certificate ${certId}`);
  }

  const gasUrl = process.env.GAS_API_URL;
  const adminApiKey = process.env.ADMIN_API_KEY || 'GGSIPU_SECURE_ADMIN_KEY_2026';
  const certificateLink = pdfUrl || '#';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .header { background: #1e3a8a; padding: 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 22px; letter-spacing: 0.5px; }
        .header p { margin: 6px 0 0 0; font-size: 13px; color: #dbeafe; }
        .content { padding: 28px 24px; line-height: 1.6; }
        .cert-card { background: #f8fafc; border-left: 4px solid #d97706; padding: 14px 18px; margin: 20px 0; border-radius: 4px; }
        .cert-id { font-family: monospace; font-size: 15px; font-weight: bold; color: #1e3a8a; }
        .btn-container { text-align: center; margin: 30px 0 20px 0; }
        .btn { background-color: #1e3a8a; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(30,58,138,0.3); }
        .footer { padding: 18px 24px; background: #f1f5f9; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Guru Gobind Singh Indraprastha University</h1>
          <p>Directorate of Students' Welfare (DSW) &bull; CertVault</p>
        </div>
        <div class="content">
          <p>Dear <strong>${name || 'Student'}</strong>,</p>
          <p>We are pleased to inform you that your official certificate has been issued and verified on the GGSIPU CertVault blockchain ledger.</p>
          
          <div class="cert-card">
            <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">CERTIFICATE IDENTIFIER</div>
            <div class="cert-id">${certId || 'N/A'}</div>
          </div>

          <p>You can view, verify, and download your digital certificate directly via the link below:</p>

          <div class="btn-container">
            <a href="${certificateLink}" class="btn" target="_blank" rel="noopener noreferrer">View Certificate</a>
          </div>

          <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
            If the button above does not work, copy and paste this link into your browser:<br>
            <a href="${certificateLink}" style="color: #1e3a8a; word-break: break-all;">${certificateLink}</a>
          </p>
        </div>
        <div class="footer">
          <p>This is an automated notification from GGSIPU CertVault. Please do not reply directly to this email.</p>
          <p>&copy; ${new Date().getFullYear()} GGSIPU. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // 1. Primary for Cloud / Render: Google Apps Script Relay (HTTPS port 443 — immune to cloud SMTP blocks)
  if (gasUrl) {
    try {
      console.log(`[EMAIL SERVICE] Sending email for ${certId} via Google Apps Script relay...`);
      const gasRes = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'sendCertificateEmail',
          apiKey: adminApiKey,
          email: email.trim(),
          name: name || 'Student',
          certId: certId,
          pdfUrl: certificateLink,
          subject: 'Your Certificate – GGSIPU',
          htmlBody: htmlContent,
        }),
      });

      const gasData = await gasRes.json();
      if (gasData.status === 'success') {
        console.log(`[EMAIL SERVICE] Successfully sent email to ${email} via Google Apps Script relay!`);
        return { messageId: 'GAS_RELAY_' + Date.now(), accepted: [email] };
      } else {
        console.warn(`[EMAIL SERVICE] Google Apps Script email relay returned:`, gasData);
      }
    } catch (gasErr) {
      console.warn(`[EMAIL SERVICE] Google Apps Script relay error, attempting direct SMTP:`, gasErr.message || gasErr);
    }
  }

  // 2. Direct Nodemailer SMTP Transport fallback (Port 465 Direct SSL -> Port 587 TLS)
  const senderUser = process.env.GMAIL_USER;
  const mailOptions = {
    from: `"GGSIPU CertVault" <${senderUser}>`,
    to: email.trim(),
    subject: 'Your Certificate – GGSIPU',
    html: htmlContent,
  };

  const transporter465 = getEmailTransporter(465, true);
  if (!transporter465) {
    throw new Error('Email service is not configured. Please configure GAS_API_URL or set GMAIL_USER and GMAIL_APP_PASSWORD in environment variables.');
  }

  try {
    console.log(`[EMAIL SERVICE] Sending certificate email for ${certId} to ${email} via direct Gmail SMTP (SSL:465)...`);
    const info = await transporter465.sendMail(mailOptions);
    console.log(`[EMAIL SERVICE] Certificate email sent successfully to ${email} (Message ID: ${info.messageId})`);
    return info;
  } catch (err465) {
    console.warn(`[EMAIL SERVICE] Direct SMTP (465) failed (${err465.message}). Trying TLS (587)...`);
    const transporter587 = getEmailTransporter(587, false);
    const info = await transporter587.sendMail(mailOptions);
    console.log(`[EMAIL SERVICE] Certificate email sent successfully to ${email} via TLS 587 (Message ID: ${info.messageId})`);
    return info;
  }
}


module.exports = {
  sendCertificateEmail,
  getEmailTransporter,
  delay,
};
