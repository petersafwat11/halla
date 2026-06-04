/**
 * Email Configuration
 * Handles email transporter setup and configuration
 * Supports Gmail, SendGrid, and custom SMTP
 */

const nodemailer = require("nodemailer");

// ============================================
// CONFIGURATION CONSTANTS
// ============================================

const EMAIL_PROVIDERS = {
  GMAIL: "gmail",
  SENDGRID: "sendgrid",
  SMTP: "smtp",
};

const DEFAULT_CONFIG = {
  provider: EMAIL_PROVIDERS.GMAIL,
  retryAttempts: 3,
  retryDelay: 1000, // ms
};

// ============================================
// TRANSPORTER FACTORY
// ============================================

/**
 * Create email transporter based on configuration
 * @returns {nodemailer.Transporter} Configured transporter
 */
const createTransporter = () => {
  // SendGrid configuration
  if (process.env.SENDGRID_API_KEY) {
    console.log("[Email Config] Using SendGrid transporter");
    return nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false,
      auth: {
        user: "apikey",
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  }

  // Custom SMTP configuration
  if (process.env.SMTP_HOST) {
    console.log("[Email Config] Using custom SMTP transporter");
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: process.env.SMTP_TLS_REJECT !== "false",
      },
    });
  }

  // Default Gmail configuration
  console.log("[Email Config] Using Gmail transporter");
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

/**
 * Get default sender email address
 * @returns {string} Formatted sender address
 */
const getDefaultSender = () => {
  const senderName = process.env.EMAIL_SENDER_NAME || "Halaa";
  const senderEmail = process.env.EMAIL_FROM || process.env.EMAIL_USERNAME;
  return `${senderName} <${senderEmail}>`;
};

/**
 * Get email configuration
 * @returns {Object} Email configuration object
 */
const getConfig = () => ({
  sender: getDefaultSender(),
  retryAttempts:
    parseInt(process.env.EMAIL_RETRY_ATTEMPTS) || DEFAULT_CONFIG.retryAttempts,
  retryDelay:
    parseInt(process.env.EMAIL_RETRY_DELAY) || DEFAULT_CONFIG.retryDelay,
  baseUrl:
    process.env.FRONTEND_URL || process.env.BASE_URL || "https://labbe.sa",
  supportEmail: process.env.SUPPORT_EMAIL || "support@halaa.net",
  companyName: process.env.COMPANY_NAME || "Halaa",
  companyNameAr: process.env.COMPANY_NAME_AR || "هلا",
});

// ============================================
// EXPORTS
// ============================================

module.exports = {
  createTransporter,
  getDefaultSender,
  getConfig,
  EMAIL_PROVIDERS,
  DEFAULT_CONFIG,
};
