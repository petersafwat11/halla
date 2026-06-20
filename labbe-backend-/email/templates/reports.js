/**
 * Report Email Templates
 * Includes: Daily Reports, Weekly Reports, Invitation Reports, Analytics Reports
 */

const {
  getBaseLayout,
  getGreeting,
  getButton,
  getHighlightBox,
  getKeyValue,
  getStatsDisplay,
  getDataTable,
  getDivider,
  COLORS,
} = require("../layout");

// ============================================
// DAILY REPORT EMAIL (Admin)
// ============================================

/**
 * Daily report email for admins
 * @param {Object} data - { adminName, date, stats, alerts, dashboardUrl, attachmentNote }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const dailyReportEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const stats = data.stats || {};
  const alerts = data.alerts || [];

  const subject = isAr
    ? `التقرير اليومي - ${data.date}`
    : `Daily Report - ${data.date}`;

  // Generate alerts HTML
  const alertsHtml =
    alerts.length > 0
      ? alerts
          .map(
            (
              alert
            ) => `<div class="highlight-box ${alert.type === "warning" ? "warning-box" : alert.type === "error" ? "error-box" : "info-box"}" style="margin: 8px 0;">
          <p style="margin: 0; font-size: 14px;">
            ${alert.type === "warning" ? "⚠️" : alert.type === "error" ? "❌" : "ℹ️"} ${alert.message}
          </p>
        </div>
      `
          )
          .join("")
      : "";

  const content = `
    ${getGreeting(data.adminName, lang)}
    
    <p>${isAr ? "إليك ملخص نشاط اليوم:" : "Here's today's activity summary:"}
    </p>
    
    ${getStatsDisplay([
      {
        value: stats.newUsers || 0,
        label: isAr ? "مستخدمين جدد" : "New Users",
        variant: "info",
      },
      {
        value: stats.newEvents || 0,
        label: isAr ? "فعاليات جديدة" : "New Events",
        variant: "success",
      },
      {
        value: stats.totalInvitations || 0,
        label: isAr ? "دعوات مرسلة" : "Invitations Sent",
        variant: "info",
      },
      {
        value: stats.totalRevenue || "0 SAR",
        label: isAr ? "الإيرادات" : "Revenue",
        variant: "success",
      },
    ])}
    
    ${
      alertsHtml
        ? `
      ${getDivider()}
      <p><strong>${isAr ? "تنبيهات تحتاج انتباهك:" : "Alerts Requiring Attention:"}</strong></p>
      ${alertsHtml}
    `
        : ""
    }
    
    ${
      stats.pendingVendors > 0
        ? `
      ${getDivider()}
      <p><strong>${isAr ? "طلبات معلقة:" : "Pending Applications:"}</strong></p>
      ${
        stats.pendingVendors > 0
          ? `
        <div class="highlight-box warning-box">
          <p style="margin: 0;">⏳ ${
            isAr
              ? `${stats.pendingVendors} طلب مزود خدمة بانتظار الموافقة`
              : `${stats.pendingVendors} vendor applications pending approval`
          }
          </p>
        </div>
      `
          : ""
      }
    `
        : ""
    }
    
    ${
      stats.openTickets > 0
        ? `<div class="highlight-box error-box">
        <p style="margin: 0;">🎫 ${
          isAr
            ? `${stats.openTickets} تذكرة دعم مفتوحة`
            : `${stats.openTickets} open support tickets`
        }
        </p>
      </div>
    `
        : ""
    }
    
    ${getButton(isAr ? "عرض لوحة التحكم" : "View Dashboard", data.dashboardUrl)}
    ${
      data.attachmentNote
        ? `
      <p style="color: ${COLORS.text.muted}; font-size: 12px; text-align: center;">📎 ${isAr ? "التقرير المفصل مرفق كملف PDF" : "Detailed report attached as PDF"}
      </p>
    `
        : ""
    }
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "التقرير اليومي" : "Daily Report",
    headerSubtitle: data.date,
    headerBgColor: COLORS.primary,
    preheader: isAr
      ? `ملخص نشاط ${data.date}`
      : `Activity summary for ${data.date}`,
  });

  return { subject, html };
};

// ============================================
// WEEKLY REPORT EMAIL (Host/Vendor)
// ============================================

/**
 * Weekly report email for hosts/vendors
 * @param {Object} data - { userName, role, weekRange, stats, upcomingEvents, dashboardUrl, attachmentNote }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const weeklyReportEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const stats = data.stats || {};
  const upcomingEvents = data.upcomingEvents || [];

  const subject = isAr
    ? `التقرير الأسبوعي - ${data.weekRange}`
    : `Weekly Report - ${data.weekRange}`;

  // Generate upcoming events table
  const eventsTableHtml =
    upcomingEvents.length > 0
      ? getDataTable(
          isAr
            ? ["الفعالية", "التاريخ", "الضيوف"]
            : ["Event", "Date", "Guests"],
          upcomingEvents.map((event) => [
            event.title,
            event.date,
            event.guestCount,
          ])
        )
      : "";

  const content = `
    ${getGreeting(data.userName, lang)}
    
    <p>${
      isAr
        ? "إليك ملخص نشاطك هذا الأسبوع:"
        : "Here's your weekly activity summary:"
    }
    </p>
    
    ${
      data.role === "host"
        ? `
      ${getStatsDisplay([
        {
          value: stats.totalGuests || 0,
          label: isAr ? "إجمالي الضيوف" : "Total Guests",
          variant: "info",
        },
        {
          value: stats.confirmedRsvps || 0,
          label: isAr ? "تأكيدات الحضور" : "Confirmed RSVPs",
          variant: "success",
        },
        {
          value: stats.invitationsSent || 0,
          label: isAr ? "دعوات مرسلة" : "Invitations Sent",
          variant: "info",
        },
        {
          value: stats.responseRate ? `${stats.responseRate}%` : "0%",
          label: isAr ? "نسبة الاستجابة" : "Response Rate",
          variant: "success",
        },
      ])}
    `
        : `
      ${getStatsDisplay([
        {
          value: stats.profileViews || 0,
          label: isAr ? "مشاهدات الملف" : "Profile Views",
          variant: "info",
        },
        {
          value: stats.inquiries || 0,
          label: isAr ? "استفسارات" : "Inquiries",
          variant: "success",
        },
        {
          value: stats.bookings || 0,
          label: isAr ? "حجوزات" : "Bookings",
          variant: "success",
        },
        {
          value: stats.averageRating ? `${stats.averageRating} ⭐` : "N/A",
          label: isAr ? "متوسط التقييم" : "Avg Rating",
          variant: "warning",
        },
      ])}
    `
    }
    
    ${
      eventsTableHtml
        ? `
      ${getDivider()}
      <p><strong>${isAr ? "الفعاليات القادمة:" : "Upcoming Events:"}</strong></p>
      ${eventsTableHtml}
    `
        : ""
    }
    
    ${
      stats.tips && stats.tips.length > 0
        ? `
      ${getDivider()}
      <div class="highlight-box info-box">
        <p style="margin: 0 0 8px; font-weight: 600;">💡 ${isAr ? "نصائح لتحسين أدائك:" : "Tips to Improve:"}</p>
        <ul style="margin: 0; padding-${isAr ? "right" : "left"}: 20px;">
          ${stats.tips.map((tip) => `<li style="margin: 4px 0;">${tip}</li>`).join("")}
        </ul>
      </div>
    `
        : ""
    }
    
    ${getButton(isAr ? "عرض لوحة التحكم" : "View Dashboard", data.dashboardUrl)}
    
    ${
      data.attachmentNote
        ? `
      <p style="color: ${COLORS.text.muted}; font-size: 12px; text-align: center;">
        📎 ${isAr ? "التقرير المفصل مرفق كملف PDF" : "Detailed report attached as PDF"}
      </p>
    `
        : ""
    }
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "التقرير الأسبوعي" : "Weekly Report",
    headerSubtitle: data.weekRange,
    headerBgColor: COLORS.primary,
    preheader: isAr
      ? `ملخص نشاطك للأسبوع ${data.weekRange}`
      : `Your activity summary for ${data.weekRange}`,
  });

  return { subject, html };
};

// ============================================
// INVITATION REPORT EMAIL
// ============================================

/**
 * Invitation report email for event hosts
 * @param {Object} data - { hostName, eventTitle, eventDate, stats, guestBreakdown, eventUrl, attachmentNote }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const invitationReportEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const stats = data.stats || {};

  const subject = isAr
    ? `تقرير الدعوات: ${data.eventTitle}`
    : `Invitation Report: ${data.eventTitle}`;

  // Calculate response rate
  const responseRate =
    stats.totalInvited > 0
      ? Math.round(
          ((stats.confirmed + stats.declined + stats.maybe) /
            stats.totalInvited) *
            100
        )
      : 0;

  const content = `
    ${getGreeting(data.hostName, lang)}
    
    <p>${
      isAr
        ? `إليك تقرير الدعوات لفعالية "${data.eventTitle}":`
        : `Here's the invitation report for "${data.eventTitle}":`
    }
    </p>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "الفعالية" : "Event", data.eventTitle)}
      ${data.eventDate ? getKeyValue(isAr ? "التاريخ" : "Date", data.eventDate) : ""}
    `)}
    
    ${getStatsDisplay([
      {
        value: stats.totalInvited || 0,
        label: isAr ? "إجمالي المدعوين" : "Total Invited",
        variant: "info",
      },
      {
        value: stats.confirmed || 0,
        label: isAr ? "مؤكد" : "Confirmed",
        variant: "success",
      },
      {
        value: stats.declined || 0,
        label: isAr ? "اعتذر" : "Declined",
        variant: "error",
      },
      {
        value: stats.pending || 0,
        label: isAr ? "بانتظار الرد" : "Pending",
        variant: "warning",
      },
    ])}
    
    ${
      stats.maybe > 0
        ? `
      <p style="text-align: center; color: ${COLORS.text.secondary};">
        ${isAr ? "ربما يحضر:" : "Maybe:"} <strong>${stats.maybe}</strong>
      </p>
    `
        : ""
    }
    
    <div style="margin: 24px 0;">
      <p style="margin-bottom: 8px; font-size: 14px; color: ${COLORS.text.secondary}; text-align: center;">
        ${isAr ? "نسبة الاستجابة:" : "Response Rate:"} <strong>${responseRate}%</strong>
      </p>
      <div style="background: ${COLORS.background.footer}; border-radius: 8px; padding: 4px; max-width: 300px; margin: 0 auto;">
        <div style="background: ${COLORS.success}; height: 12px; border-radius: 6px; width: ${responseRate}%;"></div>
      </div>
    </div>
    
    ${
      data.guestBreakdown && data.guestBreakdown.length > 0
        ? `
      ${getDivider()}
      <p><strong>${isAr ? "تفاصيل الضيوف حسب الفئة:" : "Guest Breakdown by Category:"}</strong></p>
      ${getDataTable(
        isAr
          ? ["الفئة", "العدد", "النسبة"]
          : ["Category", "Count", "Percentage"],
        data.guestBreakdown.map((cat) => [
          cat.name,
          cat.count,
          `${cat.percentage}%`,
        ])
      )}
    `
        : ""
    }
    
    ${getButton(
      isAr ? "عرض تفاصيل الفعالية" : "View Event Details",
      data.eventUrl
    )}
    
    ${
      data.attachmentNote
        ? `
      <p style="color: ${COLORS.text.muted}; font-size: 12px; text-align: center;">
        📎 ${isAr ? "قائمة الضيوف المفصلة مرفقة كملف PDF" : "Detailed guest list attached as PDF"}
      </p>
    `
        : ""
    }
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تقرير الدعوات" : "Invitation Report",
    headerSubtitle: data.eventTitle,
    headerBgColor: COLORS.primary,
    preheader: isAr
      ? `تقرير دعوات فعالية "${data.eventTitle}"`
      : `Invitation report for "${data.eventTitle}"`,
  });

  return { subject, html };
};

// ============================================
// MONTHLY ANALYTICS REPORT EMAIL
// ============================================

/**
 * Monthly analytics report email
 * @param {Object} data - { recipientName, month, year, stats, trends, highlights, dashboardUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const monthlyAnalyticsEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const stats = data.stats || {};
  const trends = data.trends || {};
  const highlights = data.highlights || [];

  const monthName = isAr
    ? getArabicMonth(data.month)
    : getEnglishMonth(data.month);

  const subject = isAr
    ? `التقرير الشهري - ${monthName} ${data.year}`
    : `Monthly Report - ${monthName} ${data.year}`;

  // Generate trend indicators
  const getTrendIndicator = (value) => {
    if (value > 0)
      return `<span style="color: ${COLORS.success};">↑ ${value}%</span>`;
    if (value < 0)
      return `<span style="color: ${COLORS.error};">↓ ${Math.abs(value)}%</span>`;
    return `<span style="color: ${COLORS.text.muted};">→ 0%</span>`;
  };

  const highlightsHtml =
    highlights.length > 0
      ? `<ul style="color: ${COLORS.text.secondary}; padding-${isAr ? "right" : "left"}: 20px;">${highlights.map((h) => `<li style="margin: 8px 0;">🏆 ${h}</li>`).join("")}
      </ul>`
      : "";

  const content = `
    ${getGreeting(data.recipientName, lang)}
    
    <p>${
      isAr
        ? `إليك ملخص أداء ${monthName} ${data.year}:`
        : `Here's your performance summary for ${monthName} ${data.year}:`
    }
    </p>
    
    ${getStatsDisplay([
      {
        value: stats.totalEvents || 0,
        label: isAr ? "الفعاليات" : "Events",
        variant: "info",
      },
      {
        value: stats.totalGuests || 0,
        label: isAr ? "الضيوف" : "Guests",
        variant: "info",
      },
      {
        value: stats.totalRevenue || "0 SAR",
        label: isAr ? "الإيرادات" : "Revenue",
        variant: "success",
      },
      {
        value: stats.averageRating ? `${stats.averageRating} ⭐` : "N/A",
        label: isAr ? "التقييم" : "Rating",
        variant: "warning",
      },
    ])}
    
    ${
      trends.events !== undefined ||
      trends.guests !== undefined ||
      trends.revenue !== undefined
        ? `
      ${getDivider()}
      <p><strong>${isAr ? "مقارنة بالشهر السابق:" : "Compared to Last Month:"}</strong></p>
      <div style="display: flex; justify-content: space-around; flex-wrap: wrap; margin: 16px 0;">
        ${
          trends.events !== undefined
            ? `
          <div style="text-align: center; padding: 12px;">
            <p style="margin: 0; font-size: 14px; color: ${COLORS.text.secondary};">${isAr ? "الفعاليات" : "Events"}</p>
            <p style="margin: 4px 0 0; font-size: 18px; font-weight: bold;">${getTrendIndicator(trends.events)}</p>
          </div>
        `
            : ""
        }
        ${
          trends.guests !== undefined
            ? `
          <div style="text-align: center; padding: 12px;">
            <p style="margin: 0; font-size: 14px; color: ${COLORS.text.secondary};">${isAr ? "الضيوف" : "Guests"}</p>
            <p style="margin: 4px 0 0; font-size: 18px; font-weight: bold;">${getTrendIndicator(trends.guests)}</p>
          </div>
        `
            : ""
        }
        ${
          trends.revenue !== undefined
            ? `
          <div style="text-align: center; padding: 12px;">
            <p style="margin: 0; font-size: 14px; color: ${COLORS.text.secondary};">${isAr ? "الإيرادات" : "Revenue"}</p>
            <p style="margin: 4px 0 0; font-size: 18px; font-weight: bold;">${getTrendIndicator(trends.revenue)}</p>
          </div>
        `
            : ""
        }
      </div>
    `
        : ""
    }
    
    ${
      highlightsHtml
        ? `
      ${getDivider()}
      <p><strong>${isAr ? "أبرز الإنجازات:" : "Highlights:"}</strong></p>
      ${highlightsHtml}
    `
        : ""
    }
    
    ${getButton(
      isAr ? "عرض التقرير الكامل" : "View Full Report",
      data.dashboardUrl
    )}
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "التقرير الشهري" : "Monthly Report",
    headerSubtitle: `${monthName} ${data.year}`,
    headerBgColor: COLORS.primary,
    preheader: isAr
      ? `ملخص أداء ${monthName} ${data.year}`
      : `Performance summary for ${monthName} ${data.year}`,
  });

  return { subject, html };
};

// ============================================
// EVENT SUMMARY REPORT EMAIL
// ============================================

/**
 * Event summary report email (post-event)
 * @param {Object} data - { hostName, eventTitle, eventDate, stats, feedback, mediaUrl, dashboardUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const eventSummaryReportEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const stats = data.stats || {};
  const feedback = data.feedback || {};

  const subject = isAr
    ? `ملخص فعاليتك: ${data.eventTitle}`
    : `Event Summary: ${data.eventTitle}`;

  const content = `
    ${getGreeting(data.hostName, lang)}
    
    <div class="highlight-box success-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.success};">
        🎉 ${isAr ? "تهانينا على نجاح فعاليتك!" : "Congratulations on your successful event!"}
      </p>
    </div>
    
    <p>${
      isAr
        ? `إليك ملخص فعالية "${data.eventTitle}" التي أقيمت في ${data.eventDate}:`
        : `Here's the summary for "${data.eventTitle}" held on ${data.eventDate}:`
    }
    </p>
    
    ${getStatsDisplay([
      {
        value: stats.totalInvited || 0,
        label: isAr ? "المدعوين" : "Invited",
        variant: "info",
      },
      {
        value: stats.attended || 0,
        label: isAr ? "الحضور" : "Attended",
        variant: "success",
      },
      {
        value: stats.checkedIn || 0,
        label: isAr ? "تم تسجيلهم" : "Checked In",
        variant: "success",
      },
      {
        value: stats.attendanceRate || 0,
        label: isAr ? "عدد القبول" : "Acceptance Count",
        variant: "info",
      },
    ])}
    
    ${
      feedback.averageRating
        ? `
      ${getDivider()}
      <div style="text-align: center; margin: 24px 0;">
        <p style="margin: 0; font-size: 14px; color: ${COLORS.text.secondary};">${isAr ? "تقييم الضيوف" : "Guest Rating"}</p>
        <p style="margin: 8px 0 0; font-size: 36px; color: ${COLORS.warning};">
          ${"★".repeat(Math.round(feedback.averageRating))}${"☆".repeat(5 - Math.round(feedback.averageRating))}
        </p>
        <p style="margin: 4px 0 0; font-size: 18px; font-weight: bold;">${feedback.averageRating}/5</p>
        ${feedback.totalReviews ? `<p style="margin: 4px 0 0; font-size: 12px; color: ${COLORS.text.muted};">(${feedback.totalReviews} ${isAr ? "تقييم" : "reviews"})</p>` : ""}
      </div>
    `
        : ""
    }
    
    ${
      feedback.topComments && feedback.topComments.length > 0
        ? `<p><strong>${isAr ? "أبرز التعليقات:" : "Top Comments:"}</strong></p>
      ${feedback.topComments
        .map(
          (comment) => `
        <div style="background: ${COLORS.background.footer}; padding: 12px 16px; border-radius: 8px; margin: 8px 0; font-style: italic; color: ${COLORS.text.secondary};">
          "${comment}"
        </div>
      `
        )
        .join("")}
    `
        : ""
    }
    
    ${
      data.mediaUrl
        ? getButton(
            isAr ? "عرض الصور والذكريات" : "View Photos & Memories",
            data.mediaUrl,
            "secondary"
          )
        : ""
    }
    
    ${getButton(
      isAr ? "عرض التقرير الكامل" : "View Full Report",
      data.dashboardUrl
    )}
    <p style="color: ${COLORS.text.secondary}; font-size: 14px; text-align: center;">
      ${
        isAr
          ? "شكراً لاستخدامك هلا! نتطلع لخدمتك في فعالياتك القادمة."
          : "Thank you for using Halaa! We look forward to serving you in your future events."
      }
    </p>
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "ملخص الفعالية" : "Event Summary",
    headerSubtitle: data.eventTitle,
    headerBgColor: COLORS.success,
    preheader: isAr
      ? `ملخص فعالية "${data.eventTitle}"`
      : `Summary for "${data.eventTitle}"`,
  });

  return { subject, html };
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get Arabic month name
 * @param {number} month - Month number (1-12)
 * @returns {string} Arabic month name
 */
const getArabicMonth = (month) => {
  const months = [
    "يناير",
    "فبراير",
    "مارس",
    "أبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
  ];
  return months[month - 1] || "";
};

/**
 * Get English month name
 * @param {number} month - Month number (1-12)
 * @returns {string} English month name
 */
const getEnglishMonth = (month) => {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[month - 1] || "";
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  dailyReportEmail,
  weeklyReportEmail,
  invitationReportEmail,
  monthlyAnalyticsEmail,
  eventSummaryReportEmail,
  // Helpers
  getArabicMonth,
  getEnglishMonth,
};
