/**
 * Support Email Templates
 * Includes: Ticket Created, Ticket Assigned, Ticket Response, Ticket Resolved, Feedback Request
 */

const {
  getBaseLayout,
  getGreeting,
  getButton,
  getHighlightBox,
  getKeyValue,
  getBadge,
  COLORS,
} = require("../layout");
const { getConfig } = require("../config");

// ============================================
// PRIORITY & STATUS HELPERS
// ============================================

const PRIORITY_CONFIG = {
  low: {
    label: { ar: "منخفضة", en: "Low" },
    color: COLORS.info,
    badge: "info",
  },
  medium: {
    label: { ar: "متوسطة", en: "Medium" },
    color: COLORS.warning,
    badge: "warning",
  },
  high: {
    label: { ar: "عالية", en: "High" },
    color: COLORS.error,
    badge: "error",
  },
  urgent: {
    label: { ar: "عاجلة", en: "Urgent" },
    color: COLORS.error,
    badge: "error",
  },
};

const STATUS_CONFIG = {
  open: {
    label: { ar: "مفتوحة", en: "Open" },
    color: COLORS.info,
    badge: "info",
  },
  in_progress: {
    label: { ar: "قيد المعالجة", en: "In Progress" },
    color: COLORS.warning,
    badge: "warning",
  },
  waiting_customer: {
    label: { ar: "بانتظار الرد", en: "Waiting for Customer" },
    color: COLORS.warning,
    badge: "warning",
  },
  resolved: {
    label: { ar: "تم الحل", en: "Resolved" },
    color: COLORS.success,
    badge: "success",
  },
  closed: {
    label: { ar: "مغلقة", en: "Closed" },
    color: COLORS.text.muted,
    badge: "info",
  },
};

// ============================================
// TICKET CREATED EMAIL (User)
// ============================================

/**
 * Ticket created confirmation email for users
 * @param {Object} data - { recipientName, ticketId, subject, category, priority, message, ticketUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const ticketCreatedEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const priority = PRIORITY_CONFIG[data.priority] || PRIORITY_CONFIG.medium;

  const subject = isAr
    ? `تم إنشاء تذكرة الدعم #${data.ticketId}`
    : `Support Ticket Created #${data.ticketId}`;

  const content = `
    ${getGreeting(data.recipientName || data.name, lang)}
    
    <div class="highlight-box success-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.success};">
        ✓ ${isAr ? "تم إنشاء تذكرة الدعم بنجاح" : "Support ticket created successfully"}
      </p>
    </div>
    
    <p>${
      isAr
        ? "شكراً لتواصلك معنا. تم استلام طلبك وسيقوم فريق الدعم بالرد عليك في أقرب وقت ممكن."
        : "Thank you for contacting us. Your request has been received and our support team will respond as soon as possible."
    }
    </p>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "رقم التذكرة" : "Ticket #", `<strong>#${data.ticketId}</strong>`)}
      ${getKeyValue(isAr ? "الموضوع" : "Subject", data.subject)}
      ${data.category ? getKeyValue(isAr ? "التصنيف" : "Category", data.category) : ""}
      ${getKeyValue(isAr ? "الأولوية" : "Priority", `<span style="color: ${priority.color}; font-weight: 600;">${isAr ? priority.label.ar : priority.label.en}</span>`)}
    `)}
    
    ${
      data.message
        ? `
      <p><strong>${isAr ? "رسالتك:" : "Your Message:"}</strong></p>
      <div style="background: ${COLORS.background.footer}; padding: 16px; border-radius: 8px; color: ${COLORS.text.secondary}; white-space: pre-wrap;">
${data.message}
      </div>
    `
        : ""
    }
    
    ${getButton(isAr ? "عرض التذكرة" : "View Ticket", data.ticketUrl)}
    
    <p style="color: ${COLORS.text.secondary}; font-size: 14px;">
      ${
        isAr
          ? "سنقوم بإخطارك عبر البريد الإلكتروني عند وجود أي تحديثات على تذكرتك."
          : "We will notify you via email when there are any updates to your ticket."
      }
    </p>
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تم إنشاء تذكرة الدعم" : "Support Ticket Created",
    headerSubtitle: `#${data.ticketId}`,
    headerBgColor: COLORS.success,
    preheader: isAr
      ? `تم إنشاء تذكرة الدعم #${data.ticketId}`
      : `Support ticket #${data.ticketId} created`,
  });

  return { subject, html };
};

// ============================================
// TICKET ASSIGNED EMAIL (Support Agent)
// ============================================

/**
 * Ticket assigned notification email for support agents
 * @param {Object} data - { agentName, ticketId, subject, priority, recipientName, userEmail, message, ticketUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const ticketAssignedEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const priority = PRIORITY_CONFIG[data.priority] || PRIORITY_CONFIG.medium;

  const subject = isAr
    ? `تم تعيين تذكرة جديدة لك #${data.ticketId}`
    : `New Ticket Assigned to You #${data.ticketId}`;

  const content = `
    ${getGreeting(data.agentName, lang)}
    
    <div class="highlight-box ${priority.badge === "error" ? "error-box" : priority.badge === "warning" ? "warning-box" : "info-box"}">
      <p style="margin: 0; font-size: 16px; font-weight: 600;">🎫 ${isAr ? "تم تعيين تذكرة جديدة لك" : "A new ticket has been assigned to you"}
      </p>
    </div>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "رقم التذكرة" : "Ticket #", `<strong>#${data.ticketId}</strong>`)}
      ${getKeyValue(isAr ? "الموضوع" : "Subject", data.subject)}
      ${getKeyValue(isAr ? "الأولوية" : "Priority", `<span style="color: ${priority.color}; font-weight: 600;">${isAr ? priority.label.ar : priority.label.en}</span>`)}
      ${getKeyValue(isAr ? "المستخدم" : "User", data.recipientName || data.name)}
      ${data.userEmail ? getKeyValue(isAr ? "البريد الإلكتروني" : "Email", data.userEmail) : ""}
    `)}
    
    ${
      data.message
        ? `
      <p><strong>${isAr ? "رسالة المستخدم:" : "User Message:"}</strong></p>
      <div style="background: ${COLORS.background.footer}; padding: 16px; border-radius: 8px; color: ${COLORS.text.secondary}; white-space: pre-wrap;">
${data.message}
      </div>
    `
        : ""
    }
    
    ${getButton(
      isAr ? "الرد على التذكرة" : "Respond to Ticket",
      data.ticketUrl
    )}
    
    ${
      data.priority === "urgent" || data.priority === "high"
        ? `
      <div class="highlight-box error-box">
        <p style="margin: 0; font-size: 14px;">
          ⚠️ ${
            isAr
              ? "هذه تذكرة ذات أولوية عالية. يرجى الرد في أقرب وقت ممكن."
              : "This is a high priority ticket. Please respond as soon as possible."
          }
        </p>
      </div>
    `
        : ""
    }
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تذكرة جديدة" : "New Ticket Assigned",
    headerSubtitle: `#${data.ticketId}`,
    headerBgColor: priority.color,
    preheader: isAr
      ? `تم تعيين تذكرة #${data.ticketId} لك`
      : `Ticket #${data.ticketId} assigned to you`,
  });

  return { subject, html };
};

// ============================================
// TICKET RESPONSE EMAIL (User)
// ============================================

/**
 * Ticket response notification email for users
 * @param {Object} data - { recipientName, ticketId, subject, agentName, response, ticketUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const ticketResponseEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `رد جديد على تذكرتك #${data.ticketId}`
    : `New Response to Your Ticket #${data.ticketId}`;

  const content = `
    ${getGreeting(data.recipientName || data.name, lang)}
    
    <div class="highlight-box info-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.info};">
        💬 ${isAr ? "رد جديد على تذكرتك" : "New response to your ticket"}
      </p>
    </div>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "رقم التذكرة" : "Ticket #", `#${data.ticketId}`)}
      ${getKeyValue(isAr ? "الموضوع" : "Subject", data.subject)}
      ${data.agentName ? getKeyValue(isAr ? "من" : "From", data.agentName) : ""}
    `)}
    
    <p><strong>${isAr ? "الرد:" : "Response:"}</strong></p>
    <div style="background: ${COLORS.background.footer}; padding: 16px; border-radius: 8px; color: ${COLORS.text.secondary}; white-space: pre-wrap; border-${isAr ? "right" : "left"}: 4px solid ${COLORS.info};">
${data.response}</div>
    
    ${getButton(isAr ? "الرد على التذكرة" : "Reply to Ticket", data.ticketUrl)}
    <p style="color: ${COLORS.text.secondary}; font-size: 14px;">
      ${
        isAr
          ? "إذا كان لديك أي استفسارات إضافية، يمكنك الرد مباشرة على التذكرة."
          : "If you have any additional questions, you can reply directly to the ticket."
      }
    </p>
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "رد جديد" : "New Response",
    headerSubtitle: `#${data.ticketId}`,
    headerBgColor: COLORS.info,
    preheader: isAr
      ? `رد جديد على تذكرتك #${data.ticketId}`
      : `New response to your ticket #${data.ticketId}`,
  });

  return { subject, html };
};

// ============================================
// TICKET RESOLVED EMAIL (User)
// ============================================

/**
 * Ticket resolved notification email for users
 * @param {Object} data - { recipientName, ticketId, subject, resolution, feedbackUrl, ticketUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const ticketResolvedEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `تم حل تذكرتك #${data.ticketId}`
    : `Your Ticket Has Been Resolved #${data.ticketId}`;

  const content = `
    ${getGreeting(data.recipientName || data.name, lang)}
    
    <div class="highlight-box success-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.success};">
        ✓ ${isAr ? "تم حل تذكرتك بنجاح" : "Your ticket has been resolved"}
      </p>
    </div>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "رقم التذكرة" : "Ticket #", `#${data.ticketId}`)}
      ${getKeyValue(isAr ? "الموضوع" : "Subject", data.subject)}
      ${getKeyValue(isAr ? "الحالة" : "Status", `<span style="color: ${COLORS.success}; font-weight: 600;">${isAr ? "تم الحل" : "Resolved"}</span>`)}
    `)}
    
    ${
      data.resolution
        ? `
      <p><strong>${isAr ? "ملخص الحل:" : "Resolution Summary:"}</strong></p>
      <div style="background: ${COLORS.successBg}; padding: 16px; border-radius: 8px; color: ${COLORS.text.secondary}; border-${isAr ? "right" : "left"}: 4px solid ${COLORS.success};">${data.resolution}
      </div>
    `
        : ""
    }<p>${
      isAr
        ? "إذا كنت راضياً عن الحل، يرجى إغلاق التذكرة. إذا كنت بحاجة إلى مزيد من المساعدة، يمكنك إعادة فتح التذكرة."
        : "If you're satisfied with the resolution, please close the ticket. If you need further assistance, you can reopen the ticket."
    }
    </p>
    
    ${getButton(isAr ? "عرض التذكرة" : "View Ticket", data.ticketUrl)}
    
    ${
      data.feedbackUrl
        ? `
      <div class="divider"></div>
      <p style="text-align: center; color: ${COLORS.text.secondary};">
        ${isAr ? "نقدر رأيك! ساعدنا في تحسين خدماتنا:" : "We value your feedback! Help us improve:"}
      </p>
      ${getButton(
        isAr ? "تقييم الخدمة" : "Rate Our Service",
        data.feedbackUrl,
        "outline"
      )}
    `
        : ""
    }
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تم حل التذكرة" : "Ticket Resolved",
    headerSubtitle: `#${data.ticketId}`,
    headerBgColor: COLORS.success,
    preheader: isAr
      ? `تم حل تذكرتك #${data.ticketId}`
      : `Your ticket #${data.ticketId} has been resolved`,
  });

  return { subject, html };
};

// ============================================
// TICKET STATUS UPDATE EMAIL
// ============================================

/**
 * Ticket status update notification email
 * @param {Object} data - { recipientName, ticketId, subject, oldStatus, newStatus, note, ticketUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const ticketStatusUpdateEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const newStatusConfig = STATUS_CONFIG[data.newStatus] || STATUS_CONFIG.open;

  const subject = isAr
    ? `تحديث حالة التذكرة #${data.ticketId}`
    : `Ticket Status Update #${data.ticketId}`;

  const content = `
    ${getGreeting(data.recipientName || data.name, lang)}
    
    <p>${
      isAr
        ? `تم تحديث حالة تذكرتك #${data.ticketId}.`
        : `The status of your ticket #${data.ticketId} has been updated.`
    }
    </p>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "رقم التذكرة" : "Ticket #", `#${data.ticketId}`)}
      ${getKeyValue(isAr ? "الموضوع" : "Subject", data.subject)}
      ${getKeyValue(isAr ? "الحالة الجديدة" : "New Status", `<span style="color: ${newStatusConfig.color}; font-weight: 600;">${isAr ? newStatusConfig.label.ar : newStatusConfig.label.en}</span>`)}
    `)}
    
    ${
      data.note
        ? `
      <p><strong>${isAr ? "ملاحظة:" : "Note:"}</strong></p>
      <div style="background: ${COLORS.background.footer}; padding: 16px; border-radius: 8px; color: ${COLORS.text.secondary};">
        ${data.note}
      </div>
    `
        : ""
    }
    
    ${getButton(isAr ? "عرض التذكرة" : "View Ticket", data.ticketUrl)}`;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تحديث حالة التذكرة" : "Ticket Status Update",
    headerSubtitle: `#${data.ticketId}`,
    headerBgColor: newStatusConfig.color,
    preheader: isAr
      ? `تم تحديث حالة تذكرتك #${data.ticketId}`
      : `Your ticket #${data.ticketId} status has been updated`,
  });

  return { subject, html };
};

// ============================================
// FEEDBACK REQUEST EMAIL
// ============================================

/**
 * Feedback request email after ticket resolution
 * @param {Object} data - { recipientName, ticketId, subject, feedbackUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const feedbackRequestEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `كيف كانت تجربتك مع الدعم؟ #${data.ticketId}`
    : `How Was Your Support Experience? #${data.ticketId}`;

  const content = `
    ${getGreeting(data.recipientName || data.name, lang)}
    
    <p>${
      isAr
        ? `شكراً لتواصلك مع فريق الدعم بخصوص "${data.subject}".`
        : `Thank you for contacting our support team regarding "${data.subject}".`
    }
    </p>
    
    <p>${
      isAr
        ? "نود معرفة رأيك في تجربتك معنا. تقييمك يساعدنا على تحسين خدماتنا."
        : "We'd love to hear about your experience with us. Your feedback helps us improve our services."
    }
    </p>
    
    <div style="text-align: center; margin: 32px 0;">
      <p style="font-size: 14px; color: ${COLORS.text.secondary}; margin-bottom: 16px;">
        ${isAr ? "كيف تقيم تجربتك؟" : "How would you rate your experience?"}
      </p>
      <div style="font-size: 36px;"><a href="${data.feedbackUrl}?rating=1" style="text-decoration: none; margin: 0 4px;">😞</a>
        <a href="${data.feedbackUrl}?rating=2" style="text-decoration: none; margin: 0 4px;">😐</a>
        <a href="${data.feedbackUrl}?rating=3" style="text-decoration: none; margin: 0 4px;">🙂</a>
        <a href="${data.feedbackUrl}?rating=4" style="text-decoration: none; margin: 0 4px;">😊</a>
        <a href="${data.feedbackUrl}?rating=5" style="text-decoration: none; margin: 0 4px;">😍</a>
      </div>
    </div>
    
    ${getButton(
      isAr ? "تقديم تقييم مفصل" : "Submit Detailed Feedback",
      data.feedbackUrl,
      "primary"
    )}
    <p style="color: ${COLORS.text.muted}; font-size: 12px; text-align: center;">
      ${
        isAr
          ? "تقييمك سري ويستخدم فقط لتحسين خدماتنا."
          : "Your feedback is confidential and used only to improve our services."
      }
    </p>
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "شاركنا رأيك" : "Share Your Feedback",
    headerBgColor: COLORS.primary,
    preheader: isAr
      ? "نود معرفة رأيك في تجربتك مع الدعم"
      : "We'd love to hear about your support experience",
  });

  return { subject, html };
};

// ============================================
// NEW TICKET NOTIFICATION (Admin)
// ============================================

/**
 * New ticket notification email for admins
 * @param {Object} data - { adminName, ticketId, subject, priority, recipientName, userEmail, category, ticketUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const newTicketNotificationEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const priority = PRIORITY_CONFIG[data.priority] || PRIORITY_CONFIG.medium;

  const subject = isAr
    ? `تذكرة دعم جديدة #${data.ticketId}`
    : `New Support Ticket #${data.ticketId}`;

  const content = `
    ${getGreeting(data.adminName, lang)}
    
    <div class="highlight-box ${priority.badge === "error" ? "error-box" : priority.badge === "warning" ? "warning-box" : "info-box"}">
      <p style="margin: 0; font-size: 16px; font-weight: 600;">🎫 ${isAr ? "تذكرة دعم جديدة" : "New Support Ticket"}
      </p>
    </div>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "رقم التذكرة" : "Ticket #", `<strong>#${data.ticketId}</strong>`)}
      ${getKeyValue(isAr ? "الموضوع" : "Subject", data.subject)}
      ${data.category ? getKeyValue(isAr ? "التصنيف" : "Category", data.category) : ""}
      ${getKeyValue(isAr ? "الأولوية" : "Priority", `<span style="color: ${priority.color}; font-weight: 600;">${isAr ? priority.label.ar : priority.label.en}</span>`)}
      ${getKeyValue(isAr ? "المستخدم" : "User", data.recipientName || data.name)}
      ${data.userEmail ? getKeyValue(isAr ? "البريد الإلكتروني" : "Email", data.userEmail) : ""}
    `)}
    
    ${getButton(isAr ? "عرض التذكرة" : "View Ticket", data.ticketUrl)}
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تذكرة جديدة" : "New Ticket",
    headerSubtitle: `#${data.ticketId}`,
    headerBgColor: priority.color,
    preheader: isAr
      ? `تذكرة دعم جديدة #${data.ticketId}`
      : `New support ticket #${data.ticketId}`,
  });

  return { subject, html };
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  ticketCreatedEmail,
  ticketAssignedEmail,
  ticketResponseEmail,
  ticketResolvedEmail,
  ticketStatusUpdateEmail,
  feedbackRequestEmail,
  newTicketNotificationEmail,
  // Config exportsPRIORITY_CONFIG,
  STATUS_CONFIG,
};
