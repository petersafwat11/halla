/**
 * Email Layout Templates
 * Provides base HTML layouts for all email templates
 * Supports RTL (Arabic) and LTR (English) layouts
 */

const { getConfig } = require("./config");

// ============================================
// COLOR SCHEME
// ============================================

const COLORS = {
  primary: "#c28e5c", // Gold/Bronze - Primary brand color
  primaryDark: "#a67744",
  primaryLight: "#d4a574",
  primaryBg: "#f9f4ef", // Light cream background

  success: "#22c55e",
  successBg: "#f0fdf4",
  successBorder: "#86efac",

  warning: "#f59e0b",
  warningBg: "#fffbeb",
  warningBorder: "#fcd34d",

  error: "#ef4444",
  errorBg: "#fef2f2",
  errorBorder: "#fca5a5",

  info: "#6366f1",
  infoBg: "#eef2ff",
  infoBorder: "#a5b4fc",

  text: {
    primary: "#2c2c2c",
    secondary: "#656565",
    muted: "#9ca3af",
    white: "#ffffff",
  },

  background: {
    main: "#fcfaf8",
    card: "#ffffff",
    footer: "#f9fafb",
    border: "#e5e7eb",
  },
};

// ============================================
// BASE LAYOUT TEMPLATE
// ============================================

/**
 * Generate base email layout with header, body, and footer
 * @param {string} content - Main email content HTML
 * @param {Object} options - Layout options
 * @param {string} options.lang - Language code (ar/en)
 * @param {string} options.headerTitle - Header title text
 * @param {string} options.headerSubtitle - Header subtitle text
 * @param {string} options.headerBgColor - Header background color
 * @param {boolean} options.showLogo - Whether to show logo
 * @param {string} options.logoUrl - Custom logo URL
 * @param {string} options.preheader - Email preheader text
 * @returns {string} Complete HTML email
 */
const getBaseLayout = (content, options = {}) => {
  const {
    lang = "ar",
    headerTitle = "",
    headerSubtitle = "",
    headerBgColor = COLORS.primary,
    showLogo = true,
    logoUrl = null,
    preheader = "",
  } = options;

  const config = getConfig();
  const isRTL = lang === "ar";
  const direction = isRTL ? "rtl" : "ltr";
  const textAlign = isRTL ? "right" : "left";
  const fontFamily = isRTL
    ? "'Segoe UI', Tahoma, Arial, sans-serif"
    : "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

  const companyName = isRTL ? config.companyNameAr : config.companyName;
  const footerText = isRTL
    ? "هذا بريد إلكتروني تلقائي، يرجى عدم الرد عليه"
    : "This is an automated email, please do not reply";
  const copyrightText = isRTL
    ? `© ${new Date().getFullYear()} ${companyName} - جميع الحقوق محفوظة`
    : `© ${new Date().getFullYear()} ${companyName} - All rights reserved`;

  return `
<!DOCTYPE html>
<html lang="${lang}" dir="${direction}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${headerTitle}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    
    /* Base styles */
    body {
      font-family: ${fontFamily};
      margin: 0;
      padding: 0;
      background-color: ${COLORS.background.main};
      direction: ${direction};
      width: 100% !important;
      height: 100% !important;}
    
    /* Container styles */
    .email-wrapper {
      width: 100%;
      background-color: ${COLORS.background.main};
      padding: 24px 0;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: ${COLORS.background.card};
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
    
    /* Header styles */
    .email-header {
      background: ${headerBgColor};
      color: ${COLORS.text.white};
      padding: 32px 24px;
      text-align: center;
    }
    .email-header h1 {
      margin: 0;
      font-size: 26px;
      font-weight: 600;
      line-height: 1.3;
    }
    .email-header .subtitle {
      margin: 8px 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .email-header .logo {
      width: 120px;
      height: auto;
      margin-bottom: 16px;
    }
    
    /* Body styles */
    .email-body {
      padding: 32px 24px;
      color: ${COLORS.text.primary};
      line-height: 1.7;
      text-align: ${textAlign};
    }
    .email-body p {
      margin: 0 0 16px;
      font-size: 15px;
    }
    .email-body h2 {
      margin: 0 0 16px;
      font-size: 20px;
      font-weight: 600;
      color: ${COLORS.text.primary};
    }
    .email-body h3 {
      margin: 0 0 12px;
      font-size: 17px;
      font-weight: 600;
      color: ${COLORS.text.primary};
    }
    
    /* Footer styles */
    .email-footer {
      background-color: ${COLORS.background.footer};
      padding: 24px;
      text-align: center;border-top: 1px solid ${COLORS.background.border};
    }
    .email-footer p {
      color: ${COLORS.text.muted};
      font-size: 12px;
      margin: 4px 0;
      line-height: 1.5;
    }
    .email-footer a {
      color: ${COLORS.primary};
      text-decoration: none;
    }
    
    /* Button styles */
    .btn {
      display: inline-block;
      padding: 14px 32px;
      background: ${COLORS.primary};
      color: ${COLORS.text.white} !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      margin: 16px 0;
      text-align: center;
      transition: background 0.2s ease;
    }
    .btn:hover {
      background: ${COLORS.primaryDark};
    }
    .btn-secondary {
      background: ${COLORS.info};
    }
    .btn-success {
      background: ${COLORS.success};
    }
    .btn-warning {
      background: ${COLORS.warning};
    }
    .btn-outline {
      background: transparent;
      border: 2px solid ${COLORS.primary};
      color: ${COLORS.primary} !important;
    }
    
    /* Highlight box styles */
    .highlight-box {
      background-color: ${COLORS.primaryBg};
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      border-${isRTL ? "right" : "left"}: 4px solid ${COLORS.primary};
    }
    .highlight-box p {
      margin: 8px 0;
      font-size: 14px;
    }
    .highlight-box p:first-child {
      margin-top: 0;
    }
    .highlight-box p:last-child {
      margin-bottom: 0;
    }
    
    /* Info box variants */
    .info-box {
      background-color: ${COLORS.infoBg};
      border-${isRTL ? "right" : "left"}: 4px solid ${COLORS.info};}
    .success-box {
      background-color: ${COLORS.successBg};
      border-${isRTL ? "right" : "left"}: 4px solid ${COLORS.success};
    }
    .warning-box {
      background-color: ${COLORS.warningBg};
      border-${isRTL ? "right" : "left"}: 4px solid ${COLORS.warning};
    }
    .error-box {
      background-color: ${COLORS.errorBg};
      border-${isRTL ? "right" : "left"}: 4px solid ${COLORS.error};
    }
    
    /* Stats container */
    .stats-container {
      text-align: center;
      margin: 24px 0;
    }
    .stat-item {
      display: inline-block;
      text-align: center;
      padding: 16px 24px;
      margin: 8px;
      background-color: ${COLORS.background.footer};
      border-radius: 8px;
      min-width: 100px;
    }
    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: ${COLORS.primary};
      line-height: 1.2;
    }
    .stat-value.success { color: ${COLORS.success}; }
    .stat-value.warning { color: ${COLORS.warning}; }
    .stat-value.error { color: ${COLORS.error}; }
    .stat-value.info { color: ${COLORS.info}; }
    .stat-label {
      font-size: 12px;
      color: ${COLORS.text.secondary};
      margin-top: 4px;text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    /* Table styles */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 14px;
    }
    .data-table th,
    .data-table td {
      padding: 12px 16px;
      text-align: ${textAlign};
      border-bottom: 1px solid ${COLORS.background.border};
    }
    .data-table th {
      background-color: ${COLORS.background.footer};
      font-weight: 600;
      color: ${COLORS.text.primary};
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .data-table tr:last-child td {
      border-bottom: none;
    }
    .data-table tr:hover td {
      background-color: ${COLORS.primaryBg};
    }
    
    /* Badge styles */
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-success {
      background-color: ${COLORS.successBg};
      color: ${COLORS.success};
    }
    .badge-warning {
      background-color: ${COLORS.warningBg};
      color: ${COLORS.warning};
    }
    .badge-error {
      background-color: ${COLORS.errorBg};
      color: ${COLORS.error};
    }
    .badge-info {
      background-color: ${COLORS.infoBg};
      color: ${COLORS.info};
    }
    
    /* Divider */
    .divider {
      height: 1px;
      background-color: ${COLORS.background.border};
      margin: 24px 0;
    }
    
    /* Responsive styles */
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;margin: 0 !important;border-radius: 0 !important;
      }
      .email-body {
        padding: 24px 16px !important;
      }
      .email-header {
        padding: 24px 16px !important;
      }
      .stat-item {
        display: block !important;
        margin: 8px 0 !important;
      }
      .btn {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
    }
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ""}
  <div class="email-wrapper">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding: 24px;">
          <div class="email-container">
            ${
              headerTitle
                ? `<div class="email-header">
              ${showLogo && logoUrl ? `<img src="${logoUrl}" alt="${companyName}" class="logo">` : ""}
              <h1>${headerTitle}</h1>
              ${headerSubtitle ? `<p class="subtitle">${headerSubtitle}</p>` : ""}
            </div>
            `
                : ""
            }
            <div class="email-body">
              ${content}
            </div>
            <div class="email-footer"><p>${footerText}</p>
              <p>${copyrightText}</p>${config.supportEmail ? `<p><a href="mailto:${config.supportEmail}">${config.supportEmail}</a></p>` : ""}
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;
};

// ============================================
// LAYOUT COMPONENTS
// ============================================

/**
 * Generate a greeting section
 * @param {string} name - Recipient name
 * @param {string} lang - Language code
 * @returns {string} Greeting HTML
 */
const getGreeting = (name, lang = "ar") => {
  const isAr = lang === "ar";
  return `<p style="font-size: 18px; color: ${COLORS.text.primary};">${isAr ? `مرحباً ${name}،` : `Hello ${name},`}</p>`;
};

/**
 * Generate a CTA button
 * @param {string} text - Button text
 * @param {string} url - Button URL
 * @param {string} variant - Button variant (primary/secondary/success/warning/outline)
 * @returns {string} Button HTML
 */
const getButton = (text, url, variant = "primary") => {
  const variantClass = variant !== "primary" ? `btn-${variant}` : "";
  return `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${url}" class="btn ${variantClass}" target="_blank">${text}</a>
    </div>
  `;
};

/**
 * Generate a highlight/info box
 * @param {string} content - Box content HTML
 * @param {string} variant - Box variant (default/info/success/warning/error)
 * @returns {string} Box HTML
 */
const getHighlightBox = (content, variant = "default") => {
  const variantClass = variant !== "default" ? `${variant}-box` : "";
  return `<div class="highlight-box ${variantClass}">${content}</div>`;
};

/**
 * Generate stats display
 * @param {Array} stats - Array of {value, label, variant} objects
 * @returns {string} Stats HTML
 */
const getStatsDisplay = (stats) => {
  const statsHtml = stats
    .map(
      ({ value, label, variant = "" }) => `
      <div class="stat-item">
        <div class="stat-value ${variant}">${value}</div>
        <div class="stat-label">${label}</div>
      </div>
    `
    )
    .join("");

  return `<div class="stats-container">${statsHtml}</div>`;
};

/**
 * Generate a data table
 * @param {Array} headers - Array of header strings
 * @param {Array} rows - Array of row arrays
 * @returns {string} Table HTML
 */
const getDataTable = (headers, rows) => {
  const headerHtml = headers.map((h) => `<th>${h}</th>`).join("");
  const rowsHtml = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("");

  return `
    <table class="data-table">
      <thead>
        <tr>${headerHtml}</tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>
  `;
};

/**
 * Generate a badge
 * @param {string} text - Badge text
 * @param {string} variant - Badge variant (success/warning/error/info)
 * @returns {string} Badge HTML
 */
const getBadge = (text, variant = "info") => {
  return `<span class="badge badge-${variant}">${text}</span>`;
};

/**
 * Generate a divider
 * @returns {string} Divider HTML
 */
const getDivider = () => {
  return '<div class="divider"></div>';
};

/**
 * Generate key-value pair display
 * @param {string} key - Label
 * @param {string} value - Value
 * @returns {string} Key-value HTML
 */
const getKeyValue = (key, value) => {
  return `<p><strong>${key}:</strong> ${value}</p>`;
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  getBaseLayout,
  getGreeting,
  getButton,
  getHighlightBox,
  getStatsDisplay,
  getDataTable,
  getBadge,
  getDivider,
  getKeyValue,
  COLORS,
};
