/**
 * Staff Email Templates
 * Includes: Staff Portal Access, Post-Event Content, Guest Invitation, Event Staff Notifications
 */

const {
  getBaseLayout,
  getGreeting,
  getButton,
  getHighlightBox,
  getKeyValue,
  getStatsDisplay,
  COLORS,
} = require("../layout");
const { getConfig } = require("../config");

// ============================================
// STAFF PORTAL ACCESS EMAIL
// ============================================

/**
 * Staff portal access link email
 * @param {Object} data - { staffName, eventTitle, eventDate, eventTime, venue, hostName, link, expiresIn }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const staffAccessEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const expiresIn = data.expiresIn || "48 ساعة";

  const subject = isAr
    ? `رابط الدخول لبوابة الموظفين - ${data.eventTitle}`
    : `Staff Portal Access - ${data.eventTitle}`;

  const content = `
    ${getGreeting(data.staffName, lang)}
    
    <div class="highlight-box info-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.info};">
        🎫 ${
          isAr
            ? "تم تعيينك كمشرف على مناسبة"
            : "You have been assigned as staff for an event"
        }
      </p>
    </div>
    
    <p>${
      isAr
        ? `تم تعيينك كمشرف على مناسبة "${data.eventTitle}". يمكنك الوصول إلى بوابة الموظفين لتسجيل حضور الضيوف.`
        : `You have been assigned as staff for "${data.eventTitle}". You can access the staff portal to check in guests.`
    }
    </p>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "المناسبة" : "Event", data.eventTitle)}
      ${data.eventDate ? getKeyValue(isAr ? "التاريخ" : "Date", data.eventDate) : ""}
      ${data.eventTime ? getKeyValue(isAr ? "الوقت" : "Time", data.eventTime) : ""}
      ${data.venue ? getKeyValue(isAr ? "المكان" : "Venue", data.venue) : ""}
      ${data.hostName ? getKeyValue(isAr ? "المضيف" : "Host", data.hostName) : ""}`)}
    
    ${getButton(
      isAr ? "دخول بوابة الموظفين" : "Access Staff Portal",
      data.link,
      "primary"
    )}<div class="highlight-box warning-box">
      <p style="margin: 0; font-size: 14px;">
        ⏰ ${
          isAr
            ? `هذا الرابط صالح لمدة ${expiresIn}. إذا انتهت صلاحيته، يرجى التواصل مع منظم المناسبة.`
            : `This link is valid for ${expiresIn}. If it expires, please contact the event organizer.`
        }
      </p>
    </div><div class="divider"></div>
    
    <p><strong>${isAr ? "مهامك كمشرف:" : "Your Responsibilities:"}</strong></p>
    <ul style="color: ${COLORS.text.secondary}; padding-${isAr ? "right" : "left"}: 20px;">
      <li>${isAr ? "تسجيل حضور الضيوف عند وصولهم" : "Check in guests upon arrival"}</li>
      <li>${isAr ? "التحقق من هوية الضيوف" : "Verify guest identities"}</li>
      <li>${isAr ? "مساعدة الضيوف في أي استفسارات" : "Assist guests with any inquiries"}</li>
    </ul>
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "بوابة الموظفين" : "Staff Portal Access",
    headerSubtitle: data.eventTitle,
    headerBgColor: COLORS.info,
    preheader: isAr
      ? `تم تعيينك كمشرف على ${data.eventTitle}`
      : `You've been assigned as staff for ${data.eventTitle}`,
  });

  return { subject, html };
};

// ============================================
// POST-EVENT CONTENT EMAIL
// ============================================

/**
 * Post-event content access link email for guests
 * @param {Object} data - { guestName, eventTitle, hostName, eventDate, link, mediaCount, expiresIn }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const postEventEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const expiresIn = data.expiresIn || "30 يوم";

  const subject = isAr
    ? `صور وذكريات من ${data.eventTitle}`
    : `Photos and Memories from ${data.eventTitle}`;

  const content = `
    ${getGreeting(data.guestName, lang)}
    
    <div class="highlight-box success-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.success};">
        📸 ${
          isAr
            ? "صور وذكريات جديدة متاحة!"
            : "New photos and memories available!"
        }
      </p>
    </div>
    
    <p>${
      isAr
        ? `شكراً لحضورك مناسبة "${data.eventTitle}"! قام ${data.hostName} بمشاركة صور وذكريات من المناسبة معك.`
        : `Thank you for attending "${data.eventTitle}"! ${data.hostName} has shared photos and memories from the event with you.`
    }
    </p>
    
    ${
      data.mediaCount
        ? `
      <div style="text-align: center; margin: 24px 0;">
        <div class="stat-item" style="display: inline-block;">
          <div class="stat-value" style="color: ${COLORS.primary};">${data.mediaCount}</div>
          <div class="stat-label">${isAr ? "صورة وفيديو" : "Photos & Videos"}</div>
        </div>
      </div>
    `
        : ""
    }
    
    ${getButton(
      isAr ? "مشاهدة الصور والذكريات" : "View Photos & Memories",
      data.link,
      "primary"
    )}
    
    <p style="color: ${COLORS.text.secondary}; text-align: center;">
      ${
        isAr
          ? "يمكنك الإعجاب بالصور والتعليق عليها ومشاركة ذكرياتك!"
          : "You can like photos, leave comments, and share your memories!"
      }
    </p>
    
    <p style="color: ${COLORS.text.muted}; font-size: 12px; text-align: center;">
      ${
        isAr
          ? `هذا الرابط صالح لمدة ${expiresIn}.`
          : `This link is valid for ${expiresIn}.`
      }
    </p>
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "صور وذكريات" : "Photos & Memories",
    headerSubtitle: data.eventTitle,
    headerBgColor: COLORS.primary,
    preheader: isAr
      ? `صور وذكريات من ${data.eventTitle}`
      : `Photos and memories from ${data.eventTitle}`,
  });

  return { subject, html };
};

// ============================================
// GUEST INVITATION EMAIL
// ============================================

/**
 * Guest invitation email
 * @param {Object} data - { guestName, eventTitle, hostName, eventDate, eventTime, venue, message, rsvpUrl, mapUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const guestInvitationEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `دعوة: ${data.eventTitle}`
    : `Invitation: ${data.eventTitle}`;

  const content = `
    ${getGreeting(data.guestName, lang)}
    
    <div style="text-align: center; margin: 24px 0;">
      <p style="font-size: 14px; color: ${COLORS.text.secondary}; margin: 0;">
        ${isAr ? "يسر" : ""}
      </p>
      <p style="font-size: 20px; font-weight: 600; color: ${COLORS.primary}; margin: 8px 0;">
        ${data.hostName}
      </p>
      <p style="font-size: 14px; color: ${COLORS.text.secondary}; margin: 0;">
        ${isAr ? "دعوتك لحضور" : "invites you to"}
      </p>
      <p style="font-size: 24px; font-weight: bold; color: ${COLORS.text.primary}; margin: 12px 0;">
        ${data.eventTitle}
      </p>
    </div>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "التاريخ" : "Date", data.eventDate)}
      ${getKeyValue(isAr ? "الوقت" : "Time", data.eventTime)}
      ${data.venue ? getKeyValue(isAr ? "المكان" : "Venue", data.venue) : ""}
    `)}
    
    ${
      data.message
        ? `
      <div style="background: ${COLORS.primaryBg}; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0; font-style: italic; color: ${COLORS.text.secondary};">
          "${data.message}"
        </p>
      </div>
    `
        : ""
    }
    <p style="text-align: center; font-size: 14px; color: ${COLORS.text.secondary};">
      ${isAr ? "يرجى تأكيد حضورك:" : "Please confirm your attendance:"}
    </p>
    
    <div style="text-align: center; margin: 24px 0;">
      <a href="${data.rsvpUrl}?response=confirmed" style="display: inline-block; padding: 12px 24px; background: ${COLORS.success}; color: white; text-decoration: none; border-radius: 8px; margin: 4px; font-weight: 600;">
        ${isAr ? "سأحضر ✓" : "I'll Attend ✓"}
      </a>
      <a href="${data.rsvpUrl}?response=declined" style="display: inline-block; padding: 12px 24px; background: ${COLORS.error}; color: white; text-decoration: none; border-radius: 8px; margin: 4px; font-weight: 600;">
        ${isAr ? "لن أتمكن ✗" : "Can't Attend ✗"}
      </a>
    </div>
    
    ${
      data.mapUrl
        ? `
      <p style="text-align: center;">
        <a href="${data.mapUrl}" style="color: ${COLORS.info}; text-decoration: none;">📍 ${isAr ? "عرض الموقع على الخريطة" : "View Location on Map"}
        </a>
      </p>
    `
        : ""
    }
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "دعوة خاصة" : "Special Invitation",
    headerBgColor: COLORS.primary,
    preheader: isAr
      ? `${data.hostName} يدعوك لحضور ${data.eventTitle}`
      : `${data.hostName} invites you to ${data.eventTitle}`,
  });

  return { subject, html };
};

// ============================================
// GUEST REMINDER EMAIL
// ============================================

/**
 * Guest reminder email before event
 * @param {Object} data - { guestName, eventTitle, hostName, eventDate, eventTime, venue, timeUntil, rsvpUrl, mapUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const guestReminderEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `تذكير: ${data.eventTitle} - ${data.timeUntil}`
    : `Reminder: ${data.eventTitle} - ${data.timeUntil}`;

  const content = `
    ${getGreeting(data.guestName, lang)}
    
    <div class="highlight-box warning-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.warning};">
        ⏰ ${
          isAr
            ? `المناسبة تبدأ خلال ${data.timeUntil}!`
            : `Event starts in ${data.timeUntil}!`
        }
      </p>
    </div>
    
    <p>${
      isAr
        ? `نود تذكيرك بمناسبة "${data.eventTitle}" التي دعاك إليها ${data.hostName}.`
        : `This is a reminder for "${data.eventTitle}" hosted by ${data.hostName}.`
    }
    </p>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "المناسبة" : "Event", data.eventTitle)}
      ${getKeyValue(isAr ? "التاريخ" : "Date", data.eventDate)}
      ${getKeyValue(isAr ? "الوقت" : "Time", data.eventTime)}
      ${data.venue ? getKeyValue(isAr ? "المكان" : "Venue", data.venue) : ""}
    `)}
    
    ${
      data.mapUrl
        ? getButton(
            isAr ? "عرض الموقع على الخريطة" : "View Location on Map",
            data.mapUrl,
            "primary"
          )
        : ""
    }
    
    <p style="color: ${COLORS.text.secondary}; font-size: 14px; text-align: center;">
      ${isAr ? "نتطلع لرؤيتك!" : "We look forward to seeing you!"}
    </p>
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تذكير بالمناسبة" : "Event Reminder",
    headerSubtitle: data.eventTitle,
    headerBgColor: COLORS.warning,
    preheader: isAr
      ? `تذكير: ${data.eventTitle} خلال ${data.timeUntil}`
      : `Reminder: ${data.eventTitle} in ${data.timeUntil}`,
  });

  return { subject, html };
};

// ============================================
// STAFF ASSIGNMENT NOTIFICATION
// ============================================

/**
 * Staff assignment notification email for event hosts
 * @param {Object} data - { hostName, staffName, staffPhone, eventTitle, eventDate, dashboardUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const staffAssignmentNotificationEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `تم تعيين مشرف جديد - ${data.eventTitle}`
    : `New Staff Assigned - ${data.eventTitle}`;

  const content = `
    ${getGreeting(data.hostName, lang)}
    
    <div class="highlight-box success-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.success};">
        ✓ ${isAr ? "تم تعيين مشرف جديد لمناسبتك" : "New staff assigned to your event"}
      </p>
    </div>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "اسم المشرف" : "Staff Name", data.staffName)}
      ${data.staffPhone ? getKeyValue(isAr ? "رقم الهاتف" : "Phone", data.staffPhone) : ""}
      ${getKeyValue(isAr ? "المناسبة" : "Event", data.eventTitle)}
      ${data.eventDate ? getKeyValue(isAr ? "التاريخ" : "Date", data.eventDate) : ""}
    `)}
    
    <p>${
      isAr
        ? "تم إرسال رابط الدخول لبوابة الموظفين إلى المشرف."
        : "The staff portal access link has been sent to the staff member."
    }
    </p>
    
    ${getButton(isAr ? "إدارة المشرفين" : "Manage Staff", data.dashboardUrl)}
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "مشرف جديد" : "New Staff Assigned",
    headerBgColor: COLORS.success,
    preheader: isAr
      ? `تم تعيين ${data.staffName} كمشرف على ${data.eventTitle}`
      : `${data.staffName} assigned as staff for ${data.eventTitle}`,
  });

  return { subject, html };
};

// ============================================
// STAFF REMOVED NOTIFICATION
// ============================================

/**
 * Staff removed notification email
 * @param {Object} data - { staffName, eventTitle, hostName, reason }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const staffRemovedEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `تم إلغاء تعيينك كمشرف - ${data.eventTitle}`
    : `Staff Assignment Removed - ${data.eventTitle}`;

  const content = `
    ${getGreeting(data.staffName, lang)}
    
    <p>${
      isAr
        ? `نود إعلامك بأنه تم إلغاء تعيينك كمشرف على مناسبة "${data.eventTitle}".`
        : `We would like to inform you that your staff assignment for "${data.eventTitle}" has been removed.`
    }
    </p>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "المناسبة" : "Event", data.eventTitle)}
      ${data.hostName ? getKeyValue(isAr ? "المضيف" : "Host", data.hostName) : ""}`)}
    
    ${
      data.reason
        ? `
      <p><strong>${isAr ? "السبب:" : "Reason:"}</strong></p>
      <p style="color: ${COLORS.text.secondary};">${data.reason}</p>
    `
        : ""
    }
    
    <p style="color: ${COLORS.text.secondary}; font-size: 14px;">
      ${
        isAr
          ? "إذا كان لديك أي استفسار، يرجى التواصل مع منظم المناسبة."
          : "If you have any questions, please contact the event organizer."
      }
    </p>
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "إلغاء التعيين" : "Assignment Removed",
    headerBgColor: COLORS.warning,
    preheader: isAr
      ? `تم إلغاء تعيينك كمشرف على ${data.eventTitle}`
      : `Your staff assignment for ${data.eventTitle} has been removed`,
  });

  return { subject, html };
};

// ============================================
// EVENT DAY STAFF BRIEFING EMAIL
// ============================================

/**
 * Event day staff briefing email
 * @param {Object} data - { staffName, eventTitle, eventDate, eventTime, venue, hostName, guestCount, instructions, checkInUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const staffBriefingEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `تعليمات يوم المناسبة - ${data.eventTitle}`
    : `Event Day Briefing - ${data.eventTitle}`;

  const instructionsHtml =
    data.instructions && data.instructions.length > 0
      ? `<ol style="color: ${COLORS.text.secondary}; padding-${isAr ? "right" : "left"}: 20px;">${data.instructions.map((inst) => `<li style="margin: 8px 0;">${inst}</li>`).join("")}
      </ol>`
      : "";

  const content = `
    ${getGreeting(data.staffName, lang)}
    
    <div class="highlight-box info-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.info};">
        📋 ${isAr ? "تعليمات يوم المناسبة" : "Event Day Briefing"}
      </p>
    </div><p>${
      isAr
        ? `المناسبة "${data.eventTitle}" تبدأ اليوم. إليك المعلومات والتعليمات المهمة:`
        : `The event "${data.eventTitle}" starts today. Here's important information and instructions:`
    }
    </p>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "المناسبة" : "Event", data.eventTitle)}
      ${getKeyValue(isAr ? "التاريخ" : "Date", data.eventDate)}
      ${getKeyValue(isAr ? "الوقت" : "Time", data.eventTime)}
      ${data.venue ? getKeyValue(isAr ? "المكان" : "Venue", data.venue) : ""}
      ${data.hostName ? getKeyValue(isAr ? "المضيف" : "Host", data.hostName) : ""}
      ${data.guestCount ? getKeyValue(isAr ? "عدد الضيوف المتوقع" : "Expected Guests", data.guestCount) : ""}
    `)}
    
    ${
      instructionsHtml
        ? `
      <p><strong>${isAr ? "التعليمات:" : "Instructions:"}</strong></p>
      ${instructionsHtml}
    `
        : `
      <p><strong>${isAr ? "مهامك:" : "Your Tasks:"}</strong></p>
      <ul style="color: ${COLORS.text.secondary}; padding-${isAr ? "right" : "left"}: 20px;"><li>${isAr ? "الوصول قبل 30 دقيقة من بدء المناسبة" : "Arrive 30 minutes before the event starts"}</li>
        <li>${isAr ? "تسجيل حضور الضيوف عند وصولهم" : "Check in guests upon arrival"}</li>
        <li>${isAr ? "التحقق من هوية الضيوف" : "Verify guest identities"}</li>
        <li>${isAr ? "توجيه الضيوف إلى أماكنهم" : "Direct guests to their seats"}</li>
        <li>${isAr ? "الإبلاغ عن أي مشاكل للمضيف" : "Report any issues to the host"}</li>
      </ul>
    `
    }
    
    ${getButton(
      isAr ? "فتح بوابة تسجيل الحضور" : "Open Check-in Portal",
      data.checkInUrl,
      "success"
    )}
    
    <p style="color: ${COLORS.text.secondary}; font-size: 14px; text-align: center;">
      ${isAr ? "نتمنى لك يوماً موفقاً!" : "Have a great event day!"}
    </p>
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تعليمات يوم المناسبة" : "Event Day Briefing",
    headerSubtitle: data.eventTitle,
    headerBgColor: COLORS.info,
    preheader: isAr
      ? `تعليمات مهمة ليوم ${data.eventTitle}`
      : `Important instructions for ${data.eventTitle}`,
  });

  return { subject, html };
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  staffAccessEmail,
  postEventEmail,
  guestInvitationEmail,
  guestReminderEmail,
  staffAssignmentNotificationEmail,
  staffRemovedEmail,
  staffBriefingEmail,
};
