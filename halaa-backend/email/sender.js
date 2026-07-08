/**
 * Email Sender Service
 * Main class for sending emails with templates and attachments
 */

const { createTransporter, getConfig, getDefaultSender } = require("./config");

// ============================================
// EMAIL SERVICE CLASS
// ============================================

class EmailService {
  constructor() {
    this.transporter = null;
    this.config = getConfig();
    this.fromEmail = getDefaultSender();
    this.initialized = false;
  }

  /**
   * Initialize the email service
   * Creates transporter lazily on first use
   */
  initialize() {
    if (!this.initialized) {
      this.transporter = createTransporter();
      this.initialized = true;
      console.log("[EmailService] Initialized successfully");
    }
    return this;
  }

  /**
   * Get or create transporter
   * @returns {nodemailer.Transporter}
   */
  getTransporter() {
    if (!this.transporter) {
      this.initialize();
    }
    return this.transporter;
  }

  /**
   * Send email with retry logic
   * @param {Object} mailOptions - Nodemailer mail options
   * @param {number} attempt - Current attempt number
   * @returns {Promise<Object>} Send result
   */
  async sendWithRetry(mailOptions, attempt = 1) {
    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail(mailOptions);
      console.log(
        `[EmailService] Email sent successfully to ${mailOptions.to}:`,
        info.messageId
      );
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(
        `[EmailService] Attempt ${attempt} failed for ${mailOptions.to}:`,
        error.message
      );

      if (attempt < this.config.retryAttempts) {
        console.log(
          `[EmailService] Retrying in ${this.config.retryDelay}ms...`
        );
        await this.delay(this.config.retryDelay);
        return this.sendWithRetry(mailOptions, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Delay helper for retry logic
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==========================================
  // CORE SEND METHODS
  // ==========================================

  /**
   * Send email with HTML content
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} html - HTML content
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(to, subject, html, options = {}) {
    const mailOptions = {
      from: options.from || this.fromEmail,
      to,
      subject,
      html,
      attachments: options.attachments || [],
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
    };

    // Remove undefined values
    Object.keys(mailOptions).forEach(
      (key) => mailOptions[key] === undefined && delete mailOptions[key]
    );

    try {
      return await this.sendWithRetry(mailOptions);
    } catch (error) {
      console.error(`[EmailService] Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Send email with PDF attachment
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} html - HTML content
   * @param {Buffer} pdfBuffer - PDF file buffer
   * @param {string} pdfFilename - PDF filename
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Send result
   */
  async sendEmailWithPdf(
    to,
    subject,
    html,
    pdfBuffer,
    pdfFilename,
    options = {}
  ) {
    const attachments = [
      {
        filename: pdfFilename,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
      ...(options.attachments || []),
    ];

    return this.sendEmail(to, subject, html, { ...options, attachments });
  }

  /**
   * Send email with multiple attachments
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} html - HTML content
   * @param {Array} attachments - Array of attachment objects
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Send result
   */
  async sendEmailWithAttachments(to, subject, html, attachments, options = {}) {
    return this.sendEmail(to, subject, html, { ...options, attachments });
  }

  /**
   * Send bulk emails
   * @param {Array} recipients - Array of {to, subject, html, options} objects
   * @param {Object} globalOptions - Options applied to all emails
   * @returns {Promise<Array>} Array of send results
   */
  async sendBulkEmails(recipients, globalOptions = {}) {
    const results = [];
    const errors = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendEmail(
          recipient.to,
          recipient.subject,
          recipient.html,
          { ...globalOptions, ...recipient.options }
        );
        results.push({ to: recipient.to, ...result });
      } catch (error) {
        errors.push({ to: recipient.to, error: error.message });
      }
    }

    return {
      results,
      errors,
      total: recipients.length,
      sent: results.length,
      failed: errors.length,
    };
  }

  /**
   * Send templated email
   * @param {Function} templateFn - Template function that returns {subject, html}
   * @param {string} to - Recipient email
   * @param {Object} data - Data to pass to template
   * @param {string} lang - Language code
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Send result
   */
  async sendTemplatedEmail(templateFn, to, data, lang = "ar", options = {}) {
    const { subject, html } = templateFn(data, lang);
    return this.sendEmail(to, options.subject || subject, html, options);
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Verify transporter connection
   * @returns {Promise<boolean>} Connection status
   */
  async verifyConnection() {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      console.log("[EmailService] Connection verified successfully");
      return true;
    } catch (error) {
      console.error("[EmailService] Connection verification failed:", error);
      return false;
    }
  }

  /**
   * Get service configuration
   * @returns {Object} Current configuration
   */
  getConfiguration() {
    return {
      sender: this.fromEmail,
      ...this.config,
      initialized: this.initialized,
    };
  }

  /**
   * Update sender email
   * @param {string} sender - New sender email/name
   */
  setSender(sender) {
    this.fromEmail = sender;
  }

  /**
   * Close transporter connection
   */
  close() {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      this.initialized = false;
      console.log("[EmailService] Connection closed");
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

const emailService = new EmailService();

// ============================================
// EXPORTS
// ============================================

module.exports = emailService;
module.exports.EmailService = EmailService;
