import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { htmlToText as htmlToTextLib } from 'html-to-text';

dotenv.config();

const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@glyvtu.ng';
const BRAND = 'GLY VTU';
const WINE = '#235697';
const DEEP = '#114280';
const BLACK = '#0f172a';
const WHITE = '#ffffff';
const LIGHT = '#f2f6ff';
const BORDER = '#dbe6f5';
const SLATE = '#6b7280';
const LOGO_URL = process.env.EMAIL_LOGO_URL || '';
const BRAND_URL = process.env.BRAND_URL || '';
const SUPPORT_URL = process.env.SUPPORT_URL || '';
const PRIVACY_URL = process.env.PRIVACY_URL || '';
const TERMS_URL = process.env.TERMS_URL || '';
const INLINE_LOGO_CID = 'glyvtu-logo';

// HTML escaping function to prevent injection attacks
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return String(text).replace(/[&<>"']/g, (char) => map[char]);
}

// Validate and sanitize URLs to prevent open redirects
function sanitizeUrl(url) {
  if (!url) return '';
  try {
    const urlObj = new URL(url, 'https://example.com');
    // Only allow http and https protocols
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return '';
    }
    return escapeHtml(url);
  } catch {
    return '';
  }
}

function transporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: (process.env.SMTP_SECURE || 'false') === 'true',
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  });
}

function resolveLogoUrl() {
  if (LOGO_URL) return LOGO_URL;
  if (!BRAND_URL) return '';
  try {
    const origin = new URL(BRAND_URL).origin;
    return `${origin}/assets/logo/gly-vtu.png`;
  } catch {
    return '';
  }
}

function resolveLogoSrc(logoCid) {
  if (logoCid) return `cid:${logoCid}`;
  return resolveLogoUrl();
}

function getInlineLogoAttachment() {
  try {
    const logoPath = path.resolve(process.cwd(), 'public', 'assets', 'logo', 'gly-vtu.png');
    if (!fs.existsSync(logoPath)) return null;
    const content = fs.readFileSync(logoPath);
    return {
      filename: 'gly-vtu.png',
      content,
      cid: INLINE_LOGO_CID,
      contentType: 'image/png',
    };
  } catch {
    return null;
  }
}

function baseTemplate({ title, body, footer, highlight, cta, preheader, logoCid }) {
  // Escape all user-supplied and environment variable content
  const safeTitle = escapeHtml(title);
  const safeFooter = escapeHtml(footer);
  const safeLogoUrl = sanitizeUrl(resolveLogoSrc(logoCid));
  const safeBrandUrl = sanitizeUrl(BRAND_URL);
  const safeSupportUrl = sanitizeUrl(SUPPORT_URL);
  const safePrivacyUrl = sanitizeUrl(PRIVACY_URL);
  const safeTermsUrl = sanitizeUrl(TERMS_URL);
  const safePreheader = escapeHtml(preheader || '');
  const brandMark = escapeHtml((BRAND || 'Brand').split(' ')[0] || 'Brand');
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${safeTitle}</title>
    </head>
    <body style="margin:0;background:${LIGHT};font-family:Arial,sans-serif;color:${BLACK};">
      ${
        safePreheader
          ? `<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${safePreheader}</span>`
          : ''
      }
      <div style="max-width:640px;margin:0 auto;padding:32px 18px;">
        <div style="background:linear-gradient(135deg, ${WINE}, ${DEEP});padding:24px;border-radius:20px;color:${WHITE};display:flex;align-items:center;gap:14px;box-shadow:0 14px 34px rgba(27,7,16,0.28);">
          ${
            safeLogoUrl
              ? `<img src="${safeLogoUrl}" alt="${BRAND}" style="width:46px;height:46px;border-radius:12px;background:${WHITE};padding:6px;" />`
              : `<div style="width:46px;height:46px;border-radius:12px;background:${WHITE};display:flex;align-items:center;justify-content:center;color:${WINE};font-weight:700;font-size:14px;letter-spacing:0.6px;">${brandMark}</div>`
          }
          <div>
            <h1 style="margin:0;font-size:22px;letter-spacing:0.6px;">${BRAND}</h1>
            <p style="margin:6px 0 0;font-size:12px;letter-spacing:0.8px;opacity:0.9;">Nigeria Bill Payments & Wallet</p>
          </div>
        </div>
        <div style="background:${WHITE};color:${BLACK};padding:28px;border-radius:20px;margin-top:18px;border:1px solid ${BORDER};box-shadow:0 12px 30px rgba(33,12,20,0.08);">
          <h2 style="margin-top:0;color:${WINE};font-size:20px;">${safeTitle}</h2>
          ${highlight ? `<div style="background:${LIGHT};border:1px solid ${BORDER};padding:14px;border-radius:12px;margin:14px 0;color:${BLACK};">${highlight}</div>` : ''}
          ${body}
          ${
            cta?.label && cta?.href
              ? `<div style="margin-top:18px;">
                  <a href="${sanitizeUrl(cta.href)}" style="display:inline-block;background:${WINE};color:${WHITE};text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:600;">${escapeHtml(cta.label)}</a>
                </div>`
              : ''
          }
        </div>
        <p style="font-size:12px;color:${SLATE};margin-top:16px;line-height:1.6;">
          ${safeFooter}<br />Need help? Reply to this email or visit support.
        </p>
        <div style="font-size:12px;color:${SLATE};display:flex;gap:12px;flex-wrap:wrap;">
          ${safeBrandUrl ? `<a href="${safeBrandUrl}" style="color:${SLATE};">Website</a>` : ''}
          ${safeSupportUrl ? `<a href="${safeSupportUrl}" style="color:${SLATE};">Support</a>` : ''}
          ${safePrivacyUrl ? `<a href="${safePrivacyUrl}" style="color:${SLATE};">Privacy</a>` : ''}
          ${safeTermsUrl ? `<a href="${safeTermsUrl}" style="color:${SLATE};">Terms</a>` : ''}
          <span style="color:${SLATE};">© ${year} ${BRAND}</span>
        </div>
      </div>
    </body>
  </html>`;
}

function htmlToText(html) {
  if (!html) return '';
  const text = htmlToTextLib(String(html), {
    wordwrap: false,
  });
  return text.trim();
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  attachments = [],
  inlineLogo = true,
}) {
  const tx = transporter();
  if (!tx) {
    const safeSubject = String(subject ?? '').replace(/\r|\n/g, '');
    const safeTo = String(to ?? '').replace(/\r|\n/g, '');
    console.log(
      'Email skipped. Configure SMTP to send:',
      safeSubject,
      safeTo,
    );
    return;
  }
  const extraAttachments = [...attachments];
  if (inlineLogo && !attachments.some((item) => item?.cid === INLINE_LOGO_CID)) {
    const logoAttachment = getInlineLogoAttachment();
    if (logoAttachment) {
      extraAttachments.push(logoAttachment);
    }
  }
  const plainText = text || htmlToText(html);
  await tx.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    html,
    text: plainText,
    attachments: extraAttachments,
  });
}

function createReceiptPdf({ title, name, details }) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.fillColor(WINE).fontSize(20).text(BRAND, { align: 'left' });
    doc.moveDown(0.5);
    doc.fillColor(BLACK).fontSize(14).text(title);
    doc.moveDown();
    doc.fontSize(12).fillColor(BLACK).text(`Customer: ${name || 'Customer'}`);
    doc.moveDown();
    doc.fontSize(12).text('Details:');
    doc.moveDown(0.5);
    details.forEach((line) => {
      doc.circle(doc.x + 3, doc.y + 6, 2).fill(WINE);
      doc.fillColor(BLACK).text(`  ${line}`, { continued: false });
    });
    doc.moveDown(2);
    doc.fillColor('#666').fontSize(10).text('Thank you for using GLY VTU.');
    doc.end();
  });
}

function createStatementPdf({
  name,
  startDate,
  endDate,
  openingBalance = 0,
  closingBalance = 0,
  transactions,
}) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const columns = [
      { label: 'Date', width: 75 },
      { label: 'Type', width: 50 },
      { label: 'Status', width: 50 },
      { label: 'Amount', width: 65 },
      { label: 'Fee', width: 50 },
      { label: 'Total', width: 65 },
      { label: 'Balance', width: 65 },
      { label: 'Reference', width: 75 },
    ];

    const formatMoney = (value) => `NGN ${Number(value || 0).toFixed(2)}`;
    const formatDate = (value) => new Date(value).toLocaleDateString();

    const addHeader = () => {
      doc.fillColor(WINE).fontSize(20).text(BRAND, { align: 'left' });
      doc.moveDown(0.4);
      doc.fillColor(BLACK).fontSize(14).text('Account Statement');
      doc
        .fontSize(10)
        .fillColor('#666')
        .text(`Customer: ${name || 'Customer'}`);
      doc
        .fontSize(10)
        .fillColor('#666')
        .text(`Period: ${startDate} to ${endDate}`);
      doc.moveDown(0.8);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ddd').stroke();
      doc.moveDown(0.6);
    };

    const addTableHeader = () => {
      let x = 50;
      doc.fillColor(BLACK).fontSize(9).font('Helvetica-Bold');
      columns.forEach((col) => {
        doc.text(col.label, x, doc.y, { width: col.width });
        x += col.width;
      });
      doc.font('Helvetica');
      doc.moveDown(0.6);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#eee').stroke();
      doc.moveDown(0.4);
    };

    const addRow = (row) => {
      let x = 50;
      const values = [
        formatDate(row.created_at),
        String(row.type || '').toUpperCase(),
        String(row.status || '').toUpperCase(),
        formatMoney(row.amount),
        formatMoney(row.fee),
        formatMoney(row.total),
        formatMoney(row.running_balance),
        row.reference || '-',
      ];
      doc.fillColor(BLACK).fontSize(9);
      values.forEach((value, idx) => {
        doc.text(value, x, doc.y, { width: columns[idx].width });
        x += columns[idx].width;
      });
      doc.moveDown(0.6);
    };

    addHeader();
    addTableHeader();

    if (!transactions.length) {
      doc.fillColor('#666').fontSize(10).text('No transactions in this period.');
      doc.end();
      return;
    }

    transactions.forEach((row) => {
      if (doc.y > 720) {
        doc.addPage();
        addHeader();
        addTableHeader();
      }
      addRow(row);
    });

    doc.moveDown(1);
    const totalValue = transactions.reduce(
      (sum, row) => sum + Number(row.total || 0),
      0
    );
    doc
      .fillColor(BLACK)
      .fontSize(10)
      .text(`Opening balance: NGN ${Number(openingBalance || 0).toFixed(2)}`);
    doc
      .fillColor(BLACK)
      .fontSize(10)
      .text(`Closing balance: NGN ${Number(closingBalance || 0).toFixed(2)}`);
    doc
      .fillColor(BLACK)
      .fontSize(10)
      .text(`Total transactions: ${transactions.length}`);
    doc
      .fillColor(BLACK)
      .fontSize(10)
      .text(`Total value: NGN ${totalValue.toFixed(2)}`);
    doc.moveDown(0.6);
    doc.fillColor('#666').fontSize(10).text('Thank you for using GLY VTU.');
    doc.end();
  });
}

export async function sendWelcomeEmail({ to, name, accountNumber, bankName }) {
  const safeName = escapeHtml(name || 'there');
  const safeBankName = escapeHtml(bankName || 'Bank');
  const safeAccountNumber = escapeHtml(accountNumber || '');
  const html = baseTemplate({
    title: 'Welcome to GLY VTU',
    preheader: 'Welcome to GLY VTU. Your wallet for bills, airtime, and data.',
    body: `<p>Hello ${safeName},</p>
      <p>Welcome to GLY VTU, your Nigerian wallet for airtime, data, TV, electricity, and more.</p>
      <p>We are ready to help you pay bills faster and smarter.</p>
      ${
        accountNumber
          ? `<p>Your reserved account is ready:</p>
             <p><strong>${safeBankName}:</strong> ${safeAccountNumber}</p>`
          : ''
      }`,
    highlight: '<strong>Quick tip:</strong> Complete your KYC to unlock higher limits.',
    cta: BRAND_URL ? { label: 'Start Your First Top Up', href: `${BRAND_URL}/wallet` } : undefined,
    footer: 'If you did not create this account, please contact support immediately.',
    logoCid: INLINE_LOGO_CID,
  });
  await sendEmail({ to, subject: 'Welcome to GLY VTU', html });
}

export async function sendReservedAccountEmail({ to, name, accountNumber, bankName }) {
  const safeName = escapeHtml(name || 'there');
  const safeBankName = escapeHtml(bankName || 'Bank');
  const safeAccountNumber = escapeHtml(accountNumber || '');
  const html = baseTemplate({
    title: 'Your Reserved Account is Ready',
    preheader: 'Your GLY VTU reserved account is ready for funding.',
    body: `<p>Hello ${safeName},</p>
      <p>Your GLY VTU reserved account has been created successfully.</p>
      <p><strong>${safeBankName}:</strong> ${safeAccountNumber}</p>`,
    highlight: '<strong>Tip:</strong> Use this account number to top up your wallet anytime.',
    cta: BRAND_URL ? { label: 'View Account Details', href: `${BRAND_URL}/wallet` } : undefined,
    footer: 'If you did not request this, please contact support immediately.',
    logoCid: INLINE_LOGO_CID,
  });
  await sendEmail({ to, subject: `${BRAND} Reserved Account Created`, html });
}

export async function sendOtpEmail({ to, code, purpose }) {
  const title =
    purpose === 'password_reset' ? 'Reset Your Password' : 'Verify New Device';
  const html = baseTemplate({
    title,
    preheader: 'Your one-time code is inside. It expires in 10 minutes.',
    highlight: `<div style="font-size:28px;font-weight:700;letter-spacing:6px;color:${WINE};text-align:center;">${code}</div>`,
    body: `<p>Use this one-time code to continue.</p>
      <p>This code expires in 10 minutes and can be used once.</p>`,
    footer: 'If you did not request this, you can ignore this email.',
    logoCid: INLINE_LOGO_CID,
  });
  await sendEmail({ to, subject: `${BRAND} OTP Code`, html });
}

export async function sendReceiptEmail({ to, name, title, details }) {
  const safeName = escapeHtml(name || 'there');
  const safeDetails = details.map((d) => escapeHtml(String(d)));
  const pdf = await createReceiptPdf({ title, name, details });
  const html = baseTemplate({
    title: title || 'Receipt',
    preheader: 'Your payment was successful. View the receipt details inside.',
    body: `<p>Hello ${safeName},</p>
      <p>Your transaction was successful. Here are the details:</p>
      <ul style="padding-left:18px;line-height:1.6;">${safeDetails
        .map((d) => `<li>${d}</li>`)
        .join('')}</ul>`,
    highlight: '<strong>Status:</strong> Successful',
    cta: BRAND_URL ? { label: 'View Transactions', href: `${BRAND_URL}/transactions` } : undefined,
    footer: 'Thank you for using GLY VTU.',
    logoCid: INLINE_LOGO_CID,
  });
  await sendEmail({
    to,
    subject: `${BRAND} Receipt`,
    html,
    attachments: [{ filename: `glyvtu-receipt-${Date.now()}.pdf`, content: pdf }],
  });
}

export async function sendStatementEmail({
  to,
  name,
  startDate,
  endDate,
  openingBalance,
  closingBalance,
  transactions = [],
}) {
  const totalCount = transactions.length;
  const totalValue = transactions.reduce(
    (sum, row) => sum + Number(row.total || 0),
    0
  );
  const pdf = await createStatementPdf({
    name,
    startDate,
    endDate,
    openingBalance,
    closingBalance,
    transactions,
  });
  const html = baseTemplate({
    title: 'Your Account Statement',
    preheader: 'Your account statement is attached as a PDF.',
    highlight: `<strong>Statement period:</strong> ${startDate} to ${endDate}<br/>
      <strong>Total transactions:</strong> ${totalCount}<br/>
      <strong>Total value:</strong> NGN ${totalValue.toFixed(2)}<br/>
      <strong>Closing balance:</strong> NGN ${Number(closingBalance || 0).toFixed(2)}`,
    body: `<p>Hello ${escapeHtml(name || 'there')},</p>
      <p>Your requested account statement is attached as a PDF.</p>
      <p>For your security, please keep this document private.</p>`,
    footer: 'If you did not request this statement, contact support immediately.',
    logoCid: INLINE_LOGO_CID,
  });
  await sendEmail({
    to,
    subject: `${BRAND} Account Statement`,
    html,
    attachments: [{ filename: `glyvtu-statement-${Date.now()}.pdf`, content: pdf }],
  });
}

export async function generateStatementPdf({
  name,
  startDate,
  endDate,
  openingBalance,
  closingBalance,
  transactions = [],
}) {
  return createStatementPdf({
    name,
    startDate,
    endDate,
    openingBalance,
    closingBalance,
    transactions,
  });
}

export async function generateReceiptPdf({ title, name, details }) {
  return createReceiptPdf({ title, name, details });
}

export async function sendSecurityEmail({ to, title, message }) {
  const html = baseTemplate({
    title,
    preheader: 'Important security notification about your account.',
    body: `<p>${escapeHtml(message)}</p>`,
    footer: 'If this was not you, please secure your account immediately.',
    logoCid: INLINE_LOGO_CID,
  });
  await sendEmail({ to, subject: `${BRAND} Security Alert`, html });
}

export async function sendAnomalyAlertEmail({ to, anomalyType, details, severity = 'medium' }) {
  // Map anomaly types to human-readable descriptions
  const anomalyLabels = {
    'anomaly.withdrawal.amount': {
      title: 'Large Withdrawal Detected',
      description: 'An unusually large withdrawal was attempted from your account.',
      recommendedAction: 'Verify this was you. If not, change your password immediately.'
    },
    'anomaly.withdrawal.frequency': {
      title: 'Multiple Withdrawals Detected',
      description: 'Multiple withdrawals were made in a short period.',
      recommendedAction: 'Monitor your account for suspicious activity.'
    },
    'anomaly.devices.count': {
      title: 'Multiple Devices Detected',
      description: 'Your account is logged in on 5 or more devices.',
      recommendedAction: 'Review your active sessions and remove any unfamiliar devices.'
    },
    'anomaly.login.failed': {
      title: 'Failed Login Attempts',
      description: 'Multiple failed login attempts were detected on your account.',
      recommendedAction: 'If this was not you, reset your password immediately.'
    },
    'anomaly.admin.adjustment': {
      title: 'Large Account Adjustment',
      description: 'A large adjustment was made to your account by our administrators.',
      recommendedAction: 'Contact support if you did not authorize this action.'
    },
  };

  const anomalyInfo = anomalyLabels[anomalyType] || {
    title: 'Unusual Activity Detected',
    description: 'Unusual activity was detected on your account.',
    recommendedAction: 'Review your account security settings immediately.'
  };

  const severityColor = severity === 'high' ? '#dc2626' : severity === 'medium' ? '#ea580c' : '#f59e0b';
  const severityLabel = severity === 'high' ? 'HIGH' : severity === 'medium' ? 'MEDIUM' : 'LOW';

  const html = baseTemplate({
    title: anomalyInfo.title,
    preheader: 'We detected unusual activity on your GLY VTU account.',
    highlight: `<div style="background: ${severityColor}; color: white; padding: 12px; border-radius: 4px; margin-bottom: 16px;"><strong>SEVERITY: ${severityLabel}</strong></div>`,
    body: `<p>Hello,</p>
      <p>${anomalyInfo.description}</p>
      ${details ? `<p><strong>Details:</strong></p><ul style="padding-left:18px;line-height:1.8;">${
        Object.entries(details)
          .map(([key, value]) => `<li><strong>${escapeHtml(String(key))}:</strong> ${escapeHtml(String(value))}</li>`)
          .join('')
      }</ul>` : ''}
      <p><strong>Recommended Action:</strong> ${anomalyInfo.recommendedAction}</p>`,
    cta: BRAND_URL ? { label: 'Review Account Security', href: `${BRAND_URL}/security` } : undefined,
    footer: 'If you did not authorize this activity, please secure your account immediately.',
    logoCid: INLINE_LOGO_CID,
  });
  await sendEmail({ to, subject: `${BRAND} Security Alert: ${anomalyInfo.title}`, html });
}

export async function sendKycStatusEmail({ to, name, status, reason = '' }) {
  const pretty = status === 'verified' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Pending';
  const html = baseTemplate({
    title: `KYC ${pretty}`,
    preheader: `Your KYC verification is ${pretty.toLowerCase()}.`,
    highlight: `<strong>Status:</strong> ${pretty}`,
    body: `<p>Hello ${escapeHtml(name || 'there')},</p>
      <p>Your KYC verification is now <strong>${pretty}</strong>.</p>
      ${reason ? `<p>Reason: ${escapeHtml(reason)}</p>` : ''}`,
    cta: BRAND_URL
      ? {
          label: pretty === 'Rejected' ? 'Resubmit KYC' : 'View KYC Status',
          href: `${BRAND_URL}/settings/kyc`,
        }
      : undefined,
    footer: 'Thanks for keeping your account secure.',
    logoCid: INLINE_LOGO_CID,
  });
  await sendEmail({ to, subject: `${BRAND} KYC ${pretty}`, html });
}

export async function sendBillFailedEmail({ to, name, details }) {
  const safeName = escapeHtml(name || 'there');
  const safeDetails = details.map((d) => escapeHtml(String(d)));
  const html = baseTemplate({
    title: 'Bill Payment Failed',
    preheader: 'Your bill payment was not completed. See details inside.',
    highlight: '<strong>Status:</strong> Failed',
    body: `<p>Hello ${safeName},</p>
      <p>Your bill payment could not be completed.</p>
      <ul style="padding-left:18px;line-height:1.6;">${safeDetails
        .map((d) => `<li>${d}</li>`)
        .join('')}</ul>`,
    cta: BRAND_URL ? { label: 'Try Again', href: `${BRAND_URL}/bills` } : undefined,
    footer: 'You can try again or contact support if this persists.',
    logoCid: INLINE_LOGO_CID,
  });
  await sendEmail({ to, subject: `${BRAND} Bill Payment Failed`, html });
}

export async function sendLoginFailedEmail({ to, ip, userAgent }) {
  const html = baseTemplate({
    title: 'Failed Login Attempt',
    preheader: 'We detected a failed login attempt on your account.',
    highlight: '<strong>Security notice</strong>',
    body: `<p>We detected a failed login attempt on your account.</p>
      <p>IP: ${escapeHtml(ip || 'Unknown')}<br/>Device: ${escapeHtml(userAgent || 'Unknown')}</p>
      <p>If this wasn't you, reset your password immediately.</p>`,
    cta: BRAND_URL ? { label: 'Secure My Account', href: `${BRAND_URL}/security` } : undefined,
    footer: "We're watching for suspicious activity to protect your account.",
    logoCid: INLINE_LOGO_CID,
  });
  await sendEmail({ to, subject: `${BRAND} Failed Login Attempt`, html });
}

export async function sendAccountClosureRequestEmail({
  to,
  name,
  deletionDateLabel,
  cancelUrl,
}) {
  const html = baseTemplate({
    title: 'Account Closure Requested',
    preheader: 'We received your request to close your GLY VTU account.',
    highlight: `<strong>Scheduled deletion:</strong> ${escapeHtml(deletionDateLabel)}`,
    body: `<p>Hello ${escapeHtml(name || 'there')},</p>
      <p>We received your request to close your GLY VTU account. Your data will be deleted on the date above unless you cancel this request.</p>
      <p>If you did not make this request, cancel immediately to keep your account active.</p>`,
    cta: cancelUrl ? { label: 'Cancel Account Closure', href: cancelUrl } : undefined,
    footer: 'If you need help, contact support and we will assist you.',
    logoCid: INLINE_LOGO_CID,
  });
  await sendEmail({ to, subject: `${BRAND} Account Closure Requested`, html });
}

export async function sendDataExportRequestedEmail({ to, name }) {
  const html = baseTemplate({
    title: 'Data Export Requested',
    preheader: 'We received your request for a copy of your account data.',
    body: `<p>Hello ${escapeHtml(name || 'there')},</p>
      <p>Your data export request has been received. You will receive your data within 24 hours.</p>
      <p>For your security, we will only send the export to this email address.</p>`,
    footer: 'If you did not request this, please contact support immediately.',
    logoCid: INLINE_LOGO_CID,
  });
  await sendEmail({ to, subject: `${BRAND} Data Export Requested`, html });
}
