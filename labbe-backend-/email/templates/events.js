/**
 * Event Email Templates
 * Includes: Event Reminders, RSVP Notifications, Guest Check-in, Event Updates
 */

const {
  getBaseLayout,
  getGreeting,
  getButton,
  getHighlightBox,
  getKeyValue,
  getStatsDisplay,
  getBadge,
  COLORS,
} = require("../layout");
const { getConfig } = require("../config");

// ============================================
// EVENT REMINDER EMAIL
// ============================================

/**
 * Event reminder email for hosts
 * @param {Object} data - { hostName, eventTitle, eventDate, eventTime, venue, timeUntil, eventUrl, guestCount }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const eventReminderEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `تذكير: ${data.eventTitle}`
    : `Reminder: ${data.eventTitle}`;

  const content = `
    ${getGreeting(data.hostName, lang)}
    
    <p>${
      isAr
        ? `فعاليتك "${data.eventTitle}" تبدأ خلال ${data.timeUntil}.`
        : `Your event "${data.eventTitle}" starts in ${data.timeUntil}.`
    }
    </p>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "اسم الفعالية" : "Event Name", data.eventTitle)}
      ${getKeyValue(isAr ? "التاريخ" : "Date", data.eventDate)}
      ${getKeyValue(isAr ? "الوقت" : "Time", data.eventTime)}
      ${data.venue ? getKeyValue(isAr ? "المكان" : "Venue", data.venue) : ""}
      ${data.guestCount ? getKeyValue(isAr ? "عدد الضيوف" : "Guest Count", data.guestCount) : ""}
    `)}
    
    ${getButton(isAr ? "عرض الفعالية" : "View Event", data.eventUrl)}
    
    <p style="color: ${COLORS.text.secondary}; font-size: 14px;">
      ${
        isAr
          ? "تأكد من أن كل شيء جاهز لفعاليتك!"
          : "Make sure everything is ready for your event!"
      }
    </p>
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تذكير بالفعالية" : "Event Reminder",
    headerSubtitle: data.eventTitle,
    headerBgColor: COLORS.warning,
    preheader: isAr
      ? `فعاليتك تبدأ خلال ${data.timeUntil}`
      : `Your event starts in ${data.timeUntil}`,
  });

  return { subject, html };
};

// ============================================
// GUEST RSVP NOTIFICATION
// ============================================

/**
 * Guest RSVP notification email for hosts
 * @param {Object} data - { hostName, guestName, response, eventTitle, eventUrl, totalConfirmed, totalDeclined }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const guestRsvpEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const responseText = {
    confirmed: { ar: "قبل الدعوة", en: "accepted", color: COLORS.success },
    declined: { ar: "اعتذر عن الحضور", en: "declined", color: COLORS.error },
    maybe: { ar: "ربما يحضر", en: "responded maybe", color: COLORS.warning },
  };

  const response = responseText[data.response] || responseText.confirmed;

  const subject = isAr
    ? `رد ضيف: ${data.eventTitle}`
    : `Guest RSVP: ${data.eventTitle}`;

  const content = `
    ${getGreeting(data.hostName, lang)}
    
    <div class="highlight-box ${data.response === "confirmed" ? "success-box" : data.response === "declined" ? "error-box" : "warning-box"}">
      <p style="margin: 0; font-size: 16px;">
        <strong>${data.guestName}</strong> 
        ${isAr ? response.ar : response.en}${isAr ? `لفعالية "${data.eventTitle}"` : `your invitation to "${data.eventTitle}"`}
      </p>
    </div>
    
    ${
      data.totalConfirmed !== undefined || data.totalDeclined !== undefined
        ? `
      <p style="margin-top: 20px;"><strong>${isAr ? "ملخص الردود:" : "Response Summary:"}</strong></p>
      ${getStatsDisplay([
        {
          value: data.totalConfirmed || 0,
          label: isAr ? "مؤكد" : "Confirmed",
          variant: "success",
        },
        {
          value: data.totalDeclined || 0,
          label: isAr ? "اعتذر" : "Declined",
          variant: "error",
        },
        {
          value: data.totalPending || 0,
          label: isAr ? "بانتظار الرد" : "Pending",
          variant: "warning",
        },
      ])}
    `
        : ""
    }
    
    ${getButton(isAr ? "عرض قائمة الضيوف" : "View Guest List", data.eventUrl)}`;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "رد ضيف على الدعوة" : "Guest RSVP Response",
    headerBgColor: response.color,
    preheader: isAr
      ? `${data.guestName} ${response.ar}`
      : `${data.guestName} has ${response.en}`,
  });

  return { subject, html };
};

// ============================================
// GUEST CHECK-IN NOTIFICATION
// ============================================

/**
 * Guest check-in notification email for hosts
 * @param {Object} data - { hostName, guestName, eventTitle, checkedInBy, checkedInAt, totalCheckedIn, totalGuests }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const guestCheckInEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `تسجيل حضور ضيف - ${data.eventTitle}`
    : `Guest Check-in - ${data.eventTitle}`;

  const checkedInAt = data.checkedInAt
    ? new Date(data.checkedInAt).toLocaleString(isAr ? "ar-SA" : "en-US")
    : new Date().toLocaleString(isAr ? "ar-SA" : "en-US");

  const content = `
    ${getGreeting(data.hostName, lang)}
    
    <div class="highlight-box success-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.success};">
        ✓ ${isAr ? "تم تسجيل حضور ضيف" : "Guest Checked In"}
      </p><p style="margin: 8px 0 0; font-size: 18px; font-weight: bold;">
        ${data.guestName}
      </p>
      ${
        data.checkedInBy
          ? `<p style="margin: 4px 0 0; font-size: 14px; color: ${COLORS.text.secondary};">
        ${isAr ? `بواسطة ${data.checkedInBy}` : `By ${data.checkedInBy}`}
      </p>`
          : ""
      }
    </div>
    
    ${getHighlightBox(
      `
      ${getKeyValue(isAr ? "المناسبة" : "Event", data.eventTitle)}
      ${getKeyValue(isAr ? "الوقت" : "Time", checkedInAt)}
    `,
      "info"
    )}
    
    ${
      data.totalCheckedIn !== undefined && data.totalGuests !== undefined
        ? `
      <p style="text-align: center; font-size: 14px; color: ${COLORS.text.secondary};">
        ${
          isAr
            ? `تم تسجيل حضور ${data.totalCheckedIn} من ${data.totalGuests} ضيف`
            : `${data.totalCheckedIn} of ${data.totalGuests} guests checked in`
        }
      </p>
      <div style="background: ${COLORS.background.footer}; border-radius: 8px; padding: 4px; margin: 16px 0;">
        <div style="background: ${COLORS.success}; height: 8px; border-radius: 6px; width: ${Math.round((data.totalCheckedIn / data.totalGuests) * 100)}%;"></div>
      </div>
    `
        : ""
    }
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تسجيل حضور ضيف" : "Guest Check-in",
    headerBgColor: COLORS.success,
    preheader: isAr
      ? `${data.guestName} وصل إلى ${data.eventTitle}`
      : `${data.guestName} arrived at ${data.eventTitle}`,
  });

  return { subject, html };
};

// ============================================
// EVENT CREATED CONFIRMATION
// ============================================

/**
 * Event created confirmation email
 * @param {Object} data - { hostName, eventTitle, eventDate, eventTime, venue, guestCount, eventUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const eventCreatedEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `تم إنشاء فعاليتك: ${data.eventTitle}`
    : `Event Created: ${data.eventTitle}`;

  const content = `
    ${getGreeting(data.hostName, lang)}
    
    <div class="highlight-box success-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.success};">
        🎉 ${isAr ? "تم إنشاء فعاليتك بنجاح!" : "Your event has been created successfully!"}
      </p>
    </div>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "اسم الفعالية" : "Event Name", data.eventTitle)}
      ${getKeyValue(isAr ? "التاريخ" : "Date", data.eventDate)}
      ${getKeyValue(isAr ? "الوقت" : "Time", data.eventTime)}
      ${data.venue ? getKeyValue(isAr ? "المكان" : "Venue", data.venue) : ""}
      ${data.guestCount ? getKeyValue(isAr ? "عدد الضيوف" : "Guest Count", data.guestCount) : ""}
    `)}<p>${
      isAr
        ? "يمكنك الآن إدارة فعاليتك ومتابعة ردود الضيوف من لوحة التحكم."
        : "You can now manage your event and track guest responses from your dashboard."
    }
    </p>
    
    ${getButton(isAr ? "عرض الفعالية" : "View Event", data.eventUrl)}
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تم إنشاء الفعالية" : "Event Created",
    headerBgColor: COLORS.success,
    preheader: isAr
      ? `تم إنشاء فعاليتك "${data.eventTitle}" بنجاح`
      : `Your event "${data.eventTitle}" has been created`,
  });

  return { subject, html };
};

// ============================================
// EVENT UPDATED NOTIFICATION
// ============================================

/**
 * Event updated notification email
 * @param {Object} data - { hostName, eventTitle, changes, eventUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const eventUpdatedEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `تم تحديث فعاليتك: ${data.eventTitle}`
    : `Event Updated: ${data.eventTitle}`;

  const changesHtml =
    data.changes && data.changes.length > 0
      ? `<ul style="color: ${COLORS.text.secondary}; padding-${isAr ? "right" : "left"}: 20px;">
        ${data.changes.map((change) => `<li>${change}</li>`).join("")}</ul>`
      : "";

  const content = `
    ${getGreeting(data.hostName, lang)}
    
    <p>${
      isAr
        ? `تم تحديث فعاليتك "${data.eventTitle}" بنجاح.`
        : `Your event "${data.eventTitle}" has been updated successfully.`
    }
    </p>
    
    ${
      changesHtml
        ? `
      <p><strong>${isAr ? "التغييرات:" : "Changes:"}</strong></p>
      ${changesHtml}
    `
        : ""
    }
    
    ${getButton(isAr ? "عرض الفعالية" : "View Event", data.eventUrl)}
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تم تحديث الفعالية" : "Event Updated",
    headerBgColor: COLORS.info,
    preheader: isAr
      ? `تم تحديث فعاليتك "${data.eventTitle}"`
      : `Your event "${data.eventTitle}" has been updated`,
  });

  return { subject, html };
};

// ============================================
// EVENT CANCELLED NOTIFICATION
// ============================================

/**
 * Event cancelled notification email
 * @param {Object} data - { recipientName, eventTitle, eventDate, hostName, reason, isHost }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const eventCancelledEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `تم إلغاء الفعالية: ${data.eventTitle}`
    : `Event Cancelled: ${data.eventTitle}`;

  const content = `
    ${getGreeting(data.recipientName, lang)}
    
    <div class="highlight-box error-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.error};">
        ❌ ${isAr ? "تم إلغاء الفعالية" : "Event Cancelled"}
      </p></div>
    
    <p>${
      isAr
        ? data.isHost
          ? `تم إلغاء فعاليتك "${data.eventTitle}" المقررة في ${data.eventDate}.`
          : `نأسف لإعلامك بأن فعالية "${data.eventTitle}" المقررة في ${data.eventDate} قد تم إلغاؤها.`
        : data.isHost
          ? `Your event "${data.eventTitle}" scheduled for ${data.eventDate} has been cancelled.`
          : `We regret to inform you that the event "${data.eventTitle}" scheduled for ${data.eventDate} has been cancelled.`
    }
    </p>
    
    ${
      data.reason
        ? getHighlightBox(
            `
      <p style="margin: 0;"><strong>${isAr ? "السبب:" : "Reason:"}</strong></p>
      <p style="margin: 8px 0 0;">${data.reason}</p>
    `,
            "warning"
          )
        : ""
    }
    
    ${
      !data.isHost && data.hostName
        ? `
      <p style="color: ${COLORS.text.secondary}; font-size: 14px;">
        ${
          isAr
            ? `للاستفسار، يرجى التواصل مع المضيف: ${data.hostName}`
            : `For inquiries, please contact the host: ${data.hostName}`
        }
      </p>
    `
        : ""
    }
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "إلغاء الفعالية" : "Event Cancelled",
    headerBgColor: COLORS.error,
    preheader: isAr
      ? `تم إلغاء فعالية "${data.eventTitle}"`
      : `Event "${data.eventTitle}" has been cancelled`,
  });

  return { subject, html };
};

// ============================================
// INVITATION SENT CONFIRMATION
// ============================================

/**
 * Invitation sent confirmation email
 * @param {Object} data - { hostName, eventTitle, sentCount, totalGuests, eventUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const invitationsSentEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `تم إرسال الدعوات: ${data.eventTitle}`
    : `Invitations Sent: ${data.eventTitle}`;

  const content = `
    ${getGreeting(data.hostName, lang)}
    
    <div class="highlight-box success-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.success};">✓ ${isAr ? "تم إرسال الدعوات بنجاح!" : "Invitations sent successfully!"}
      </p>
    </div>
    
    ${getStatsDisplay([
      {
        value: data.sentCount || 0,
        label: isAr ? "دعوات مرسلة" : "Invitations Sent",
        variant: "success",
      },
      {
        value: data.totalGuests || 0,
        label: isAr ? "إجمالي الضيوف" : "Total Guests",
        variant: "info",
      },
    ])}
    <p>${
      isAr
        ? "سيتم إخطارك عند رد الضيوف على الدعوات."
        : "You will be notified when guests respond to the invitations."
    }
    </p>
    
    ${getButton(isAr ? "متابعة الردود" : "Track Responses", data.eventUrl)}
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تم إرسال الدعوات" : "Invitations Sent",
    headerBgColor: COLORS.success,
    preheader: isAr
      ? `تم إرسال ${data.sentCount} دعوة لفعالية "${data.eventTitle}"`
      : `${data.sentCount} invitations sent for "${data.eventTitle}"`,
  });

  return { subject, html };
};

// ============================================
// EVENT SCHEDULED NOTIFICATION
// ============================================

/**
 * Event scheduled notification email
 * @param {Object} data - { hostName, eventTitle, scheduledDate, scheduledTime, eventUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const eventScheduledEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `تم جدولة إرسال الدعوات: ${data.eventTitle}`
    : `Invitations Scheduled: ${data.eventTitle}`;

  const content = `
    ${getGreeting(data.hostName, lang)}
    
    <div class="highlight-box info-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.info};">
        📅 ${isAr ? "تم جدولة إرسال الدعوات" : "Invitations Scheduled"}
      </p>
    </div>
    
    <p>${
      isAr
        ? `سيتم إرسال دعوات فعالية "${data.eventTitle}" تلقائياً في الموعد المحدد.`
        : `Invitations for "${data.eventTitle}" will be sent automatically at the scheduled time.`
    }
    </p>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "تاريخ الإرسال" : "Send Date", data.scheduledDate)}
      ${getKeyValue(isAr ? "وقت الإرسال" : "Send Time", data.scheduledTime)}
    `)}
    
    <p style="color: ${COLORS.text.secondary}; font-size: 14px;">
      ${
        isAr
          ? "يمكنك تعديل الجدولة أو إرسال الدعوات فوراً من لوحة التحكم."
          : "You can modify the schedule or send invitations immediately from your dashboard."
      }
    </p>
    
    ${getButton(isAr ? "إدارة الفعالية" : "Manage Event", data.eventUrl)}
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تم جدولة الدعوات" : "Invitations Scheduled",
    headerBgColor: COLORS.info,
    preheader: isAr
      ? `سيتم إرسال الدعوات في ${data.scheduledDate}`
      : `Invitations will be sent on ${data.scheduledDate}`,
  });

  return { subject, html };
};

// ============================================
// EVENT COMPLETED SUMMARY
// ============================================

/**
 * Event completed summary email
 * @param {Object} data - { hostName, eventTitle, eventDate, stats, eventUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const eventCompletedEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `ملخص الفعالية: ${data.eventTitle}`
    : `Event Summary: ${data.eventTitle}`;

  const stats = data.stats || {};

  const content = `
    ${getGreeting(data.hostName, lang)}
    
    <p>${
      isAr
        ? `نأمل أن تكون فعاليتك "${data.eventTitle}" قد كانت ناجحة! إليك ملخص الفعالية:`
        : `We hope your event "${data.eventTitle}" was successful! Here's your event summary:`
    }
    </p>
    
    ${getStatsDisplay([
      {
        value: stats.totalGuests || 0,
        label: isAr ? "إجمالي الضيوف" : "Total Guests",
        variant: "info",
      },
      {
        value: stats.confirmed || 0,
        label: isAr ? "حضور مؤكد" : "Confirmed",
        variant: "success",
      },
      {
        value: stats.checkedIn || 0,
        label: isAr ? "تم تسجيل حضورهم" : "Checked In",
        variant: "success",
      },
      {
        value: stats.declined || 0,
        label: isAr ? "اعتذروا" : "Declined",
        variant: "error",
      },
    ])}
    
    ${
      stats.responseRate
        ? `
      <p style="text-align: center; color: ${COLORS.text.secondary};">
        ${isAr ? "نسبة الاستجابة:" : "Response Rate:"} <strong>${stats.responseRate}%</strong>
      </p>
    `
        : ""
    }
    
    ${getButton(
      isAr ? "عرض التقرير الكامل" : "View Full Report",
      data.eventUrl
    )}
    <p style="color: ${COLORS.text.secondary}; font-size: 14px; text-align: center;">
      ${
        isAr
          ? "شكراً لاستخدامك لبّه! نتطلع لخدمتك في فعالياتك القادمة."
          : "Thank you for using Labbe! We look forward to serving you in your future events."
      }
    </p>
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "ملخص الفعالية" : "Event Summary",
    headerSubtitle: data.eventTitle,
    headerBgColor: COLORS.primary,
    preheader: isAr
      ? `ملخص فعالية "${data.eventTitle}"`
      : `Summary for "${data.eventTitle}"`,
  });

  return { subject, html };
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  eventReminderEmail,
  guestRsvpEmail,
  guestCheckInEmail,
  eventCreatedEmail,
  eventUpdatedEmail,
  eventCancelledEmail,
  invitationsSentEmail,
  eventScheduledEmail,
  eventCompletedEmail,
};
