/**
 * Whitelabel Email Templates
 * Includes: Application Pending, Approval, Rejection, Platform Setup, Host Management
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
// WHITELABEL APPLICATION PENDING EMAIL
// ============================================

/**
 * Whitelabel application pending email
 * @param {Object} data - { platformName, email, planName, contactPerson }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const whitelabelApplicationPendingEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? "تم استلام طلب منصتك - لبّه"
    : "Whitelabel Application Received - Labbe";

  const content = `
    ${getGreeting(data.platformName, lang)}
    
    <div class="highlight-box success-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.success};">
        ✓ ${isAr ? "تم استلام طلبك بنجاح!" : "Your application has been received!"}
      </p>
    </div>
    
    <p>${
      isAr
        ? "شكراً لتقديم طلبك للحصول على منصة العلامة البيضاء من لبّه. تم استلام طلبك بنجاح وهو الآن قيد المراجعة."
        : "Thank you for submitting your whitelabel platform application to Labbe. Your application has been received and is now under review."
    }
    </p>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "اسم المنصة" : "Platform Name", data.platformName)}
      ${getKeyValue(isAr ? "البريد الإلكتروني" : "Email", data.email)}
      ${data.planName ? getKeyValue(isAr ? "الباقة المختارة" : "Selected Plan", data.planName) : ""}
      ${data.contactPerson ? getKeyValue(isAr ? "جهة الاتصال" : "Contact Person", data.contactPerson) : ""}
      ${getKeyValue(isAr ? "حالة الطلب" : "Application Status", `<span style="color: ${COLORS.warning}; font-weight: 600;">${isAr ? "قيد المراجعة" : "Under Review"}</span>`)}
    `)}
    <p>${
      isAr
        ? "سيتواصل معك فريقنا قريباً لإتمام إجراءات التسجيل والدفع. عادةً ما نرد خلال 24-48 ساعة."
        : "Our team will contact you soon to complete the registration and payment process. We typically respond within 24-48 hours."
    }
    </p><div class="highlight-box info-box">
      <p style="margin: 0; font-size: 14px;">
        <strong>${isAr ? "ماذا يشمل طلبك؟" : "What does your application include?"}</strong>
      </p>
      <ul style="margin: 12px 0 0; padding-${isAr ? "right" : "left"}: 20px; color: ${COLORS.text.secondary};">
        <li>${isAr ? "لوحة تحكم مخصصة لإدارة الفعاليات" : "Custom dashboard for event management"}</li>
        <li>${isAr ? "دعم فني متخصص" : "Dedicated technical support"}</li>
        <li>${isAr ? "إمكانية تخصيص الهوية البصرية" : "Brand customization options"}</li>
        <li>${isAr ? "إدارة المضيفين والفعاليات" : "Host and event management"}</li>
      </ul>
    </div>`;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تم استلام طلبك!" : "Application Received!",
    headerBgColor: COLORS.success,
    preheader: isAr
      ? "تم استلام طلب منصتك بنجاح"
      : "Your whitelabel application has been received",
  });

  return { subject, html };
};

// ============================================
// WHITELABEL APPROVAL EMAIL
// ============================================

/**
 * Whitelabel approval email with password setup link
 * @param {Object} data - { platformName, email, planName, setupPasswordUrl, dashboardUrl, features }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const whitelabelApprovalEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? "تهانينا! تمت الموافقة على طلبك - لبّه"
    : "Congratulations! Your Application is Approved - Labbe";

  const featuresHtml =
    data.features && data.features.length > 0
      ? `<ul style="color: ${COLORS.text.secondary}; padding-${isAr ? "right" : "left"}: 20px; margin: 16px 0;">
        ${data.features.map((feature) => `<li style="margin: 8px 0;">✓ ${feature}</li>`).join("")}
      </ul>`
      : "";

  const content = `
    ${getGreeting(data.platformName, lang)}
    
    <div class="highlight-box success-box">
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${COLORS.success};">
        🎉 ${isAr ? "تمت الموافقة على طلبك!" : "Your application has been approved!"}
      </p>
    </div>
    
    <p>${
      isAr
        ? "يسعدنا إعلامك بأنه تمت الموافقة على طلبك للحصول على منصة العلامة البيضاء. يمكنك الآن البدء في إعداد منصتك وإدارة المضيفين والفعاليات."
        : "We're pleased to inform you that your whitelabel platform application has been approved. You can now start setting up your platform and managing hosts and events."
    }
    </p>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "اسم المنصة" : "Platform Name", data.platformName)}
      ${getKeyValue(isAr ? "البريد الإلكتروني" : "Email", data.email)}
      ${data.planName ? getKeyValue(isAr ? "الباقة" : "Plan", data.planName) : ""}
    `)}
    
    ${
      data.setupPasswordUrl
        ? `
      <p><strong>${isAr ? "الخطوة التالية - إعداد كلمة المرور:" : "Next Step - Set Up Your Password:"}</strong></p>
      <p>${
        isAr
          ? "للبدء في استخدام منصتك، يرجى إعداد كلمة المرور الخاصة بك:"
          : "To start using your platform, please set up your password:"
      }
      </p>${getButton(
        isAr ? "إعداد كلمة المرور" : "Set Up Password",
        data.setupPasswordUrl,
        "success"
      )}
    `
        : getButton(
            isAr ? "الذهاب للوحة التحكم" : "Go to Dashboard",
            data.dashboardUrl,
            "success"
          )
    }<div class="divider"></div>
    
    ${
      featuresHtml
        ? `
      <p><strong>${isAr ? "ميزات منصتك:" : "Your Platform Features:"}</strong></p>
      ${featuresHtml}
    `
        : `
      <p><strong>${isAr ? "ما يمكنك فعله الآن:" : "What you can do now:"}</strong></p>
      <ul style="color: ${COLORS.text.secondary}; padding-${isAr ? "right" : "left"}: 20px;">
        <li>${isAr ? "إضافة وإدارة المضيفين" : "Add and manage hosts"}</li>
        <li>${isAr ? "إنشاء فعاليات للمضيفين" : "Create events for hosts"}</li>
        <li>${isAr ? "تخصيص إعدادات المنصة" : "Customize platform settings"}</li>
        <li>${isAr ? "إضافة مشرفين لفريقك" : "Add moderators to your team"}</li><li>${isAr ? "متابعة الإحصائيات والتقارير" : "Track statistics and reports"}</li>
      </ul>
    `
    }
    
    <div class="highlight-box info-box">
      <p style="margin: 0; font-size: 14px;">
        💡 ${
          isAr
            ? "نصيحة: ابدأ بإضافة مضيفك الأول وإنشاء فعالية تجريبية للتعرف على المنصة."
            : "Tip: Start by adding your first host and creating a test event to familiarize yourself with the platform."
        }
      </p>
    </div>
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تمت الموافقة على طلبك!" : "Application Approved!",
    headerBgColor: COLORS.success,
    preheader: isAr
      ? "تهانينا! تمت الموافقة على منصتك"
      : "Congratulations! Your platform has been approved",
  });

  return { subject, html };
};

// ============================================
// WHITELABEL REJECTION EMAIL
// ============================================

/**
 * Whitelabel rejection email
 * @param {Object} data - { platformName, reason, supportEmail, reapplyUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const whitelabelRejectionEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const config = getConfig();

  const subject = isAr
    ? "تحديث حالة طلبك - لبّه"
    : "Application Status Update - Labbe";

  const content = `
    ${getGreeting(data.platformName, lang)}
    
    <p>${
      isAr
        ? "شكراً لاهتمامك بالحصول على منصة العلامة البيضاء من لبّه."
        : "Thank you for your interest in obtaining a whitelabel platform from Labbe."
    }
    </p>
    
    <div class="highlight-box warning-box">
      <p style="margin: 0; font-size: 16px;">
        ${
          isAr
            ? "للأسف، لم نتمكن من الموافقة على طلبك في الوقت الحالي."
            : "Unfortunately, we were unable to approve your application at this time."
        }
      </p>
    </div>
    
    ${
      data.reason
        ? `
      <p><strong>${isAr ? "السبب:" : "Reason:"}</strong></p>
      <div style="background: ${COLORS.background.footer}; padding: 16px; border-radius: 8px; color: ${COLORS.text.secondary};">
        ${data.reason}
      </div>
    `
        : ""
    }
    
    <p>${
      isAr
        ? "إذا كنت تعتقد أن هذا القرار خاطئ أو لديك معلومات إضافية ترغب في مشاركتها، يرجى التواصل مع فريقنا."
        : "If you believe this decision was made in error or have additional information you'd like to share, please contact our team."
    }
    </p>
    
    ${getButton(
      isAr ? "تواصل معنا" : "Contact Us",
      `mailto:${data.supportEmail || config.supportEmail}`,
      "primary"
    )}
    
    ${
      data.reapplyUrl
        ? `
      <p style="color: ${COLORS.text.secondary}; font-size: 14px;">
        ${
          isAr
            ? "يمكنك إعادة تقديم طلبك بعد معالجة الملاحظات المذكورة."
            : "You may reapply after addressing the feedback mentioned above."
        }
      </p>
    `
        : ""
    }
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تحديث حالة الطلب" : "Application Status Update",
    headerBgColor: COLORS.warning,
    preheader: isAr
      ? "تحديث بخصوص طلب منصتك"
      : "Update regarding your platform application",
  });

  return { subject, html };
};

// ============================================
// NEW HOST ADDED EMAIL
// ============================================

/**
 * New host added notification email for whitelabel admins
 * @param {Object} data - { adminName, hostEmail, hostPhone, dashboardUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const whitelabelNewHostEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `تم إضافة مضيف جديد: ${data.hostName}`
    : `New Host Added: ${data.hostName}`;

  const content = `
    ${getGreeting(data.adminName, lang)}
    
    <div class="highlight-box success-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.success};">
        ✓ ${isAr ? "تم إضافة مضيف جديد بنجاح!" : "New host added successfully!"}
      </p>
    </div>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "اسم المضيف" : "Host Name", data.hostName)}
      ${data.hostEmail ? getKeyValue(isAr ? "البريد الإلكتروني" : "Email", data.hostEmail) : ""}
      ${data.hostPhone ? getKeyValue(isAr ? "رقم الهاتف" : "Phone", data.hostPhone) : ""}
    `)}
    
    <p>${
      isAr
        ? "يمكنك الآن تعيين اشتراك للمضيف وإنشاء فعاليات له."
        : "You can now assign a subscription to the host and create events for them."
    }
    </p>
    
    ${getButton(isAr ? "إدارة المضيفين" : "Manage Hosts", data.dashboardUrl)}
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "مضيف جديد" : "New Host",
    headerBgColor: COLORS.success,
    preheader: isAr
      ? `تم إضافة ${data.hostName} كمضيف جديد`
      : `${data.hostName} has been added as a new host`,
  });

  return { subject, html };
};

// ============================================
// HOST SUBSCRIPTION ASSIGNED EMAIL
// ============================================

/**
 * Host subscription assigned notification email
 * @param {Object} data - { hostName, planName, assignedBy, startDate, endDate, features, dashboardUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const hostSubscriptionAssignedEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `تم تفعيل اشتراكك - ${data.planName}`
    : `Subscription Activated - ${data.planName}`;

  const featuresHtml =
    data.features && data.features.length > 0
      ? `<ul style="color: ${COLORS.text.secondary}; padding-${isAr ? "right" : "left"}: 20px; margin: 16px 0;">
        ${data.features.map((feature) => `<li style="margin: 8px 0;">✓ ${feature}</li>`).join("")}
      </ul>`
      : "";

  const content = `
    ${getGreeting(data.hostName, lang)}
    
    <div class="highlight-box success-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.success};">
        🎉 ${isAr ? "تم تفعيل اشتراكك!" : "Your subscription is now active!"}
      </p>
    </div>
    <p>${
      isAr
        ? `تم تعيين اشتراك ${data.planName} لحسابك${data.assignedBy ? ` بواسطة ${data.assignedBy}` : ""}.`
        : `A ${data.planName} subscription has been assigned to your account${data.assignedBy ? ` by ${data.assignedBy}` : ""}.`
    }
    </p>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "الباقة" : "Plan", data.planName)}
      ${data.startDate ? getKeyValue(isAr ? "تاريخ البدء" : "Start Date", data.startDate) : ""}
      ${data.endDate ? getKeyValue(isAr ? "تاريخ الانتهاء" : "End Date", data.endDate) : ""}
    `)}
    
    ${
      featuresHtml
        ? `
      <p><strong>${isAr ? "ميزات الباقة:" : "Plan Features:"}</strong></p>
      ${featuresHtml}
    `
        : ""
    }
    
    ${getButton(
      isAr ? "الذهاب للوحة التحكم" : "Go to Dashboard",
      data.dashboardUrl
    )}
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تم تفعيل الاشتراك" : "Subscription Activated",
    headerBgColor: COLORS.success,
    preheader: isAr
      ? `تم تفعيل اشتراك ${data.planName}`
      : `Your ${data.planName} subscription is now active`,
  });

  return { subject, html };
};

// ============================================
// WHITELABEL WEEKLY REPORT EMAIL
// ============================================

/**
 * Whitelabel weekly report email
 * @param {Object} data - { adminName, platformName, weekRange, stats, dashboardUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const whitelabelWeeklyReportEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const stats = data.stats || {};

  const subject = isAr
    ? `التقرير الأسبوعي لمنصة ${data.platformName}`
    : `Weekly Report for ${data.platformName}`;

  const content = `
    ${getGreeting(data.adminName, lang)}
    
    <p>${
      isAr
        ? `إليك ملخص نشاط منصة "${data.platformName}" هذا الأسبوع:`
        : `Here's the activity summary for "${data.platformName}" this week:`
    }
    </p>
    
    ${getStatsDisplay([
      {
        value: stats.totalHosts || 0,
        label: isAr ? "إجمالي المضيفين" : "Total Hosts",
        variant: "info",
      },
      {
        value: stats.activeHosts || 0,
        label: isAr ? "مضيفين نشطين" : "Active Hosts",
        variant: "success",
      },
      {
        value: stats.totalEvents || 0,
        label: isAr ? "إجمالي الفعاليات" : "Total Events",
        variant: "info",
      },
      {
        value: stats.newEvents || 0,
        label: isAr ? "فعاليات جديدة" : "New Events",
        variant: "success",
      },
    ])}
    
    ${
      stats.totalGuests || stats.confirmedGuests
        ? `
      <div class="divider"></div>
      <p><strong>${isAr ? "إحصائيات الضيوف:" : "Guest Statistics:"}</strong></p>
      ${getStatsDisplay([
        {
          value: stats.totalGuests || 0,
          label: isAr ? "إجمالي الضيوف" : "Total Guests",
          variant: "info",
        },
        {
          value: stats.confirmedGuests || 0,
          label: isAr ? "مؤكدين" : "Confirmed",
          variant: "success",
        },
        {
          value: stats.pendingGuests || 0,
          label: isAr ? "بانتظار الرد" : "Pending",
          variant: "warning",
        },
      ])}
    `
        : ""
    }
    
    ${
      stats.revenue
        ? `
      <div class="highlight-box success-box">
        <p style="margin: 0; text-align: center;">
          <span style="font-size: 14px; color: ${COLORS.text.secondary};">${isAr ? "الإيرادات هذا الأسبوع" : "Revenue This Week"}</span><br/>
          <span style="font-size: 28px; font-weight: bold; color: ${COLORS.success};">${stats.revenue}</span>
        </p>
      </div>
    `
        : ""
    }
    
    ${getButton(isAr ? "عرض لوحة التحكم" : "View Dashboard", data.dashboardUrl)}
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "التقرير الأسبوعي" : "Weekly Report",
    headerSubtitle: data.weekRange,
    headerBgColor: COLORS.primary,
    preheader: isAr
      ? `ملخص نشاط منصتك للأسبوع ${data.weekRange}`
      : `Your platform activity summary for ${data.weekRange}`,
  });

  return { subject, html };
};

// ============================================
// WHITELABEL SUBSCRIPTION EXPIRING EMAIL
// ============================================

/**
 * Whitelabel subscription expiring email
 * @param {Object} data - { adminName, platformName, planName, daysLeft, expiryDate, renewUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const whitelabelSubscriptionExpiringEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `تنبيه: اشتراك منصتك ينتهي خلال ${data.daysLeft} أيام`
    : `Alert: Your Platform Subscription Expires in ${data.daysLeft} Days`;

  const content = `
    ${getGreeting(data.adminName, lang)}
    
    <div class="highlight-box warning-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.warning};">
        ⚠️ ${
          isAr
            ? `اشتراك منصة "${data.platformName}" ينتهي خلال ${data.daysLeft} أيام`
            : `Your "${data.platformName}" platform subscription expires in ${data.daysLeft} days`
        }
      </p>
    </div>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "المنصة" : "Platform", data.platformName)}
      ${getKeyValue(isAr ? "الباقة" : "Plan", data.planName)}
      ${getKeyValue(isAr ? "تاريخ الانتهاء" : "Expiry Date", data.expiryDate)}
    `)}
    
    <p>${
      isAr
        ? "قم بتجديد اشتراكك الآن لضمان استمرار خدمات منصتك دون انقطاع."
        : "Renew your subscription now to ensure uninterrupted service for your platform."
    }
    </p>
    <div class="highlight-box error-box">
      <p style="margin: 0; font-size: 14px;">⚠️ ${
        isAr
          ? "عند انتهاء الاشتراك، لن يتمكن المضيفون من إنشاء فعاليات جديدة أو إرسال دعوات."
          : "When the subscription expires, hosts will not be able to create new events or send invitations."
      }
      </p>
    </div>
    
    ${getButton(
      isAr ? "تجديد الاشتراك الآن" : "Renew Subscription Now",
      data.renewUrl,
      "warning"
    )}
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تنبيه انتهاء الاشتراك" : "Subscription Expiring",
    headerBgColor: COLORS.warning,
    preheader: isAr
      ? `اشتراك منصتك ينتهي خلال ${data.daysLeft} أيام`
      : `Your platform subscription expires in ${data.daysLeft} days`,
  });

  return { subject, html };
};

// ============================================
// MODERATOR ADDED EMAIL
// ============================================

/**
 * Moderator added notification email
 * @param {Object} data - { moderatorName, platformName, addedBy, permissions, setupPasswordUrl, dashboardUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const moderatorAddedEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `تمت إضافتك كمشرف في ${data.platformName}`
    : `You've Been Added as a Moderator to ${data.platformName}`;

  const permissionsHtml =
    data.permissions && data.permissions.length > 0
      ? `<ul style="color: ${COLORS.text.secondary}; padding-${isAr ? "right" : "left"}: 20px; margin: 16px 0;">
        ${data.permissions.map((perm) => `<li style="margin: 8px 0;">✓ ${perm}</li>`).join("")}
      </ul>`
      : "";

  const content = `
    ${getGreeting(data.moderatorName, lang)}
    
    <div class="highlight-box success-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.success};">
        🎉 ${isAr ? "تمت إضافتك كمشرف!" : "You've been added as a moderator!"}
      </p>
    </div>
    <p>${
      isAr
        ? `تمت إضافتك كمشرف في منصة "${data.platformName}"${data.addedBy ? ` بواسطة ${data.addedBy}` : ""}.`
        : `You've been added as a moderator to "${data.platformName}"${data.addedBy ? ` by ${data.addedBy}` : ""}.`
    }
    </p>
    
    ${
      permissionsHtml
        ? `
      <p><strong>${isAr ? "صلاحياتك:" : "Your Permissions:"}</strong></p>
      ${permissionsHtml}
    `
        : ""
    }
    
    ${
      data.setupPasswordUrl
        ? `
      <p>${
        isAr
          ? "للبدء، قم بإعداد كلمة المرور الخاصة بك:"
          : "To get started, set up your password:"
      }
      </p>
      ${getButton(
        isAr ? "إعداد كلمة المرور" : "Set Up Password",
        data.setupPasswordUrl,
        "success"
      )}
    `
        : getButton(
            isAr ? "الذهاب للوحة التحكم" : "Go to Dashboard",
            data.dashboardUrl
          )
    }
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تمت إضافتك كمشرف" : "Added as Moderator",
    headerBgColor: COLORS.success,
    preheader: isAr
      ? `تمت إضافتك كمشرف في ${data.platformName}`
      : `You've been added as a moderator to ${data.platformName}`,
  });

  return { subject, html };
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  whitelabelApplicationPendingEmail,
  whitelabelApprovalEmail,
  whitelabelRejectionEmail,
  whitelabelNewHostEmail,
  hostSubscriptionAssignedEmail,
  whitelabelWeeklyReportEmail,
  whitelabelSubscriptionExpiringEmail,
  moderatorAddedEmail,
};
