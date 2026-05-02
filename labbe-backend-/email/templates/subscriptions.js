/**
 * Subscription Email Templates
 * Includes: Subscription Alerts, Renewals, Upgrades, Expirations, Payment Confirmations
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
// SUBSCRIPTION ALERT EMAIL
// ============================================

/**
 * Subscription alert email (expiring, expired, renewed)
 * @param {Object} data - { userName, alertType, planName, daysLeft, expiryDate, subscriptionUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const subscriptionAlertEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const alertTypes = {
    expiring: {
      title: { ar: "اشتراكك ينتهي قريباً", en: "Subscription Expiring Soon" },
      message: {
        ar: `اشتراكك سينتهي خلال ${data.daysLeft} أيام.`,
        en: `Your subscription expires in ${data.daysLeft} days.`,
      },
      color: COLORS.warning,
      icon: "⚠️",
      boxType: "warning-box",
    },
    expired: {
      title: { ar: "انتهى اشتراكك", en: "Subscription Expired" },
      message: {
        ar: "انتهى اشتراكك. قم بالتجديد للاستمرار في استخدام جميع الميزات.",
        en: "Your subscription has expired. Renew to continue using all features.",
      },
      color: COLORS.error,
      icon: "❌",
      boxType: "error-box",
    },
    renewed: {
      title: { ar: "تم تجديد اشتراكك", en: "Subscription Renewed" },
      message: {
        ar: "تم تجديد اشتراكك بنجاح. شكراً لاستمرارك معنا!",
        en: "Your subscription has been successfully renewed. Thank you for staying with us!",
      },
      color: COLORS.success,
      icon: "✓",
      boxType: "success-box",
    },
    activated: {
      title: { ar: "تم تفعيل اشتراكك", en: "Subscription Activated" },
      message: {
        ar: "تم تفعيل اشتراكك بنجاح. يمكنك الآن الاستمتاع بجميع الميزات.",
        en: "Your subscription has been activated. You can now enjoy all features.",
      },
      color: COLORS.success,
      icon: "🎉",
      boxType: "success-box",
    },
  };

  const alert = alertTypes[data.alertType] || alertTypes.expiring;

  const subject = isAr ? alert.title.ar : alert.title.en;

  const content = `
    ${getGreeting(data.userName, lang)}
    
    <div class="highlight-box ${alert.boxType}">
      <p style="margin: 0; font-size: 16px; font-weight: 600;">
        ${alert.icon} ${isAr ? alert.message.ar : alert.message.en}
      </p>
    </div>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "الباقة الحالية" : "Current Plan", data.planName)}
      ${data.expiryDate ? getKeyValue(isAr ? "تاريخ الانتهاء" : "Expiry Date", data.expiryDate) : ""}${data.billingCycle ? getKeyValue(isAr ? "دورة الفوترة" : "Billing Cycle", isAr ? (data.billingCycle === "monthly" ? "شهري" : "سنوي") : data.billingCycle) : ""}
    `)}
    
    ${
      data.alertType !== "renewed" && data.alertType !== "activated"
        ? getButton(
            isAr ? "تجديد الاشتراك" : "Renew Subscription",
            data.subscriptionUrl,
            data.alertType === "expired" ? "primary" : "warning"
          )
        : getButton(
            isAr ? "إدارة الاشتراك" : "Manage Subscription",
            data.subscriptionUrl
          )
    }
    
    ${
      data.alertType === "expiring"
        ? `
      <p style="color: ${COLORS.text.secondary}; font-size: 14px;">
        ${
          isAr
            ? "قم بالتجديد الآن لتجنب انقطاع الخدمة."
            : "Renew now to avoid service interruption."
        }
      </p>
    `
        : ""
    }
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? alert.title.ar : alert.title.en,
    headerBgColor: alert.color,
    preheader: isAr ? alert.message.ar : alert.message.en,
  });

  return { subject, html };
};

// ============================================
// SUBSCRIPTION CREATED EMAIL
// ============================================

/**
 * New subscription created email
 * @param {Object} data - { userName, planName, features, price, billingCycle, startDate, endDate, dashboardUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const subscriptionCreatedEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `تم تفعيل اشتراكك في باقة ${data.planName}`
    : `Your ${data.planName} Subscription is Active`;

  const featuresHtml =
    data.features && data.features.length > 0
      ? `<ul style="color: ${COLORS.text.secondary}; padding-${isAr ? "right" : "left"}: 20px; margin: 16px 0;">
        ${data.features.map((feature) => `<li style="margin: 8px 0;">✓ ${feature}</li>`).join("")}
      </ul>`
      : "";

  const content = `
    ${getGreeting(data.userName, lang)}
    
    <div class="highlight-box success-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.success};">
        🎉 ${isAr ? "تم تفعيل اشتراكك بنجاح!" : "Your subscription is now active!"}
      </p>
    </div>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "الباقة" : "Plan", data.planName)}
      ${data.price ? getKeyValue(isAr ? "السعر" : "Price", data.price) : ""}
      ${getKeyValue(isAr ? "دورة الفوترة" : "Billing Cycle", isAr ? (data.billingCycle === "monthly" ? "شهري" : "سنوي") : data.billingCycle)}
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
      ? `تم تفعيل اشتراكك في باقة ${data.planName}`
      : `Your ${data.planName} subscription is now active`,
  });

  return { subject, html };
};

// ============================================
// SUBSCRIPTION UPGRADED EMAIL
// ============================================

/**
 * Subscription upgraded email
 * @param {Object} data - { userName, oldPlan, newPlan, newFeatures, effectiveDate, subscriptionUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const subscriptionUpgradedEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `تمت ترقية اشتراكك إلى ${data.newPlan}`
    : `Subscription Upgraded to ${data.newPlan}`;

  const newFeaturesHtml =
    data.newFeatures && data.newFeatures.length > 0
      ? `<ul style="color: ${COLORS.text.secondary}; padding-${isAr ? "right" : "left"}: 20px; margin: 16px 0;">
        ${data.newFeatures.map((feature) => `<li style="margin: 8px 0;">✓ ${feature}</li>`).join("")}
      </ul>`
      : "";

  const content = `
    ${getGreeting(data.userName, lang)}
    
    <div class="highlight-box success-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.success};">🚀 ${isAr ? "تمت ترقية اشتراكك بنجاح!" : "Your subscription has been upgraded!"}
      </p>
    </div>
    
    <p>${
      isAr
        ? `تمت ترقية اشتراكك من ${data.oldPlan} إلى ${data.newPlan}.`
        : `Your subscription has been upgraded from ${data.oldPlan} to ${data.newPlan}.`
    }
    </p>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "الباقة السابقة" : "Previous Plan", data.oldPlan)}
      ${getKeyValue(isAr ? "الباقة الجديدة" : "New Plan", data.newPlan)}
      ${data.effectiveDate ? getKeyValue(isAr ? "تاريخ السريان" : "Effective Date", data.effectiveDate) : ""}
    `)}
    
    ${
      newFeaturesHtml
        ? `
      <p><strong>${isAr ? "الميزات الجديدة:" : "New Features:"}</strong></p>
      ${newFeaturesHtml}
    `
        : ""
    }
    
    ${getButton(
      isAr ? "استكشف الميزات الجديدة" : "Explore New Features",
      data.subscriptionUrl
    )}
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تمت ترقية الاشتراك" : "Subscription Upgraded",
    headerBgColor: COLORS.success,
    preheader: isAr
      ? `تمت ترقية اشتراكك إلى ${data.newPlan}`
      : `Your subscription has been upgraded to ${data.newPlan}`,
  });

  return { subject, html };
};

// ============================================
// SUBSCRIPTION DOWNGRADED EMAIL
// ============================================

/**
 * Subscription downgraded email
 * @param {Object} data - { userName, oldPlan, newPlan, effectiveDate, lostFeatures, subscriptionUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const subscriptionDowngradedEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `تم تغيير اشتراكك إلى ${data.newPlan}`
    : `Subscription Changed to ${data.newPlan}`;

  const lostFeaturesHtml =
    data.lostFeatures && data.lostFeatures.length > 0
      ? `<ul style="color: ${COLORS.text.secondary}; padding-${isAr ? "right" : "left"}: 20px; margin: 16px 0;">
        ${data.lostFeatures.map((feature) => `<li style="margin: 8px 0;">✗ ${feature}</li>`).join("")}
      </ul>`
      : "";

  const content = `
    ${getGreeting(data.userName, lang)}
    
    <div class="highlight-box warning-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.warning};">
        📋 ${isAr ? "تم تغيير اشتراكك" : "Your subscription has been changed"}
      </p>
    </div>
    
    <p>${
      isAr
        ? `تم تغيير اشتراكك من ${data.oldPlan} إلى ${data.newPlan}.`
        : `Your subscription has been changed from ${data.oldPlan} to ${data.newPlan}.`
    }
    </p>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "الباقة السابقة" : "Previous Plan", data.oldPlan)}
      ${getKeyValue(isAr ? "الباقة الجديدة" : "New Plan", data.newPlan)}
      ${data.effectiveDate ? getKeyValue(isAr ? "تاريخ السريان" : "Effective Date", data.effectiveDate) : ""}
    `)}
    
    ${
      lostFeaturesHtml
        ? `
      <p><strong>${isAr ? "الميزات التي لن تكون متاحة:" : "Features no longer available:"}</strong></p>
      ${lostFeaturesHtml}
    `
        : ""
    }
    
    ${getButton(
      isAr ? "ترقية الاشتراك" : "Upgrade Subscription",
      data.subscriptionUrl,
      "primary"
    )}
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تغيير الاشتراك" : "Subscription Changed",
    headerBgColor: COLORS.warning,
    preheader: isAr
      ? `تم تغيير اشتراكك إلى ${data.newPlan}`
      : `Your subscription has been changed to ${data.newPlan}`,
  });

  return { subject, html };
};

// ============================================
// PAYMENT CONFIRMATION EMAIL
// ============================================

/**
 * Payment confirmation email
 * @param {Object} data - { userName, amount, currency, planName, paymentDate, invoiceNumber, paymentMethod, invoiceUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const paymentConfirmationEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const currency = data.currency || "SAR";

  const subject = isAr
    ? `تأكيد الدفع - ${data.amount} ${currency}`
    : `Payment Confirmation - ${data.amount} ${currency}`;

  const content = `
    ${getGreeting(data.userName, lang)}
    
    <div class="highlight-box success-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.success};">
        ✓ ${isAr ? "تم استلام الدفع بنجاح" : "Payment received successfully"}
      </p>
    </div>
    
    <p>${
      isAr
        ? "شكراً لك! تم استلام دفعتك بنجاح."
        : "Thank you! Your payment has been received successfully."
    }
    </p>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "المبلغ" : "Amount", `${data.amount} ${currency}`)}
      ${getKeyValue(isAr ? "الباقة" : "Plan", data.planName)}
      ${data.paymentDate ? getKeyValue(isAr ? "تاريخ الدفع" : "Payment Date", data.paymentDate) : ""}
      ${data.invoiceNumber ? getKeyValue(isAr ? "رقم الفاتورة" : "Invoice Number", data.invoiceNumber) : ""}
      ${data.paymentMethod ? getKeyValue(isAr ? "طريقة الدفع" : "Payment Method", data.paymentMethod) : ""}`)}
    
    ${
      data.invoiceUrl
        ? getButton(
            isAr ? "تحميل الفاتورة" : "Download Invoice",
            data.invoiceUrl,
            "outline"
          )
        : ""
    }<p style="color: ${COLORS.text.secondary}; font-size: 14px;">
      ${
        isAr
          ? "إذا كان لديك أي استفسار حول هذه الدفعة، يرجى التواصل مع فريق الدعم."
          : "If you have any questions about this payment, please contact our support team."
      }
    </p>
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تأكيد الدفع" : "Payment Confirmation",
    headerBgColor: COLORS.success,
    preheader: isAr
      ? `تم استلام دفعتك بمبلغ ${data.amount} ${currency}`
      : `Your payment of ${data.amount} ${currency} has been received`,
  });

  return { subject, html };
};

// ============================================
// PAYMENT FAILED EMAIL
// ============================================

/**
 * Payment failed email
 * @param {Object} data - { userName, amount, currency, planName, reason, retryUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const paymentFailedEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const currency = data.currency || "SAR";

  const subject = isAr ? "فشل في عملية الدفع" : "Payment Failed";

  const content = `
    ${getGreeting(data.userName, lang)}
    
    <div class="highlight-box error-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.error};">
        ❌ ${isAr ? "فشلت عملية الدفع" : "Payment failed"}
      </p>
    </div>
    
    <p>${
      isAr
        ? "للأسف، لم نتمكن من معالجة دفعتك."
        : "Unfortunately, we were unable to process your payment."
    }
    </p>
    
    ${getHighlightBox(
      `
      ${getKeyValue(isAr ? "المبلغ" : "Amount", `${data.amount} ${currency}`)}
      ${getKeyValue(isAr ? "الباقة" : "Plan", data.planName)}
      ${data.reason ? getKeyValue(isAr ? "السبب" : "Reason", data.reason) : ""}`,
      "error"
    )}
    <p>${
      isAr
        ? "يرجى التحقق من معلومات الدفع والمحاولة مرة أخرى."
        : "Please verify your payment information and try again."
    }
    </p>
    
    ${getButton(
      isAr ? "إعادة المحاولة" : "Try Again",
      data.retryUrl,
      "primary"
    )}
    
    <p style="color: ${COLORS.text.secondary}; font-size: 14px;">
      ${
        isAr
          ? "إذا استمرت المشكلة، يرجى التواصل مع فريق الدعم."
          : "If the problem persists, please contact our support team."
      }
    </p>
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "فشل الدفع" : "Payment Failed",
    headerBgColor: COLORS.error,
    preheader: isAr
      ? "فشلت عملية الدفع - يرجى المحاولة مرة أخرى"
      : "Payment failed - please try again",
  });

  return { subject, html };
};

// ============================================
// SUBSCRIPTION CANCELLED EMAIL
// ============================================

/**
 * Subscription cancelled email
 * @param {Object} data - { userName, planName, endDate, reason, reactivateUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const subscriptionCancelledEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr ? "تم إلغاء اشتراكك" : "Subscription Cancelled";

  const content = `
    ${getGreeting(data.userName, lang)}
    
    <div class="highlight-box warning-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.warning};">
        📋 ${isAr ? "تم إلغاء اشتراكك" : "Your subscription has been cancelled"}
      </p>
    </div>
    
    <p>${
      isAr
        ? "نأسف لرؤيتك تغادر! تم إلغاء اشتراكك بنجاح."
        : "We're sorry to see you go! Your subscription has been cancelled."
    }
    </p>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "الباقة" : "Plan", data.planName)}
      ${data.endDate ? getKeyValue(isAr ? "تاريخ انتهاء الخدمة" : "Service End Date", data.endDate) : ""}
    `)}
    
    <p style="color: ${COLORS.text.secondary};">
      ${
        isAr
          ? `ستظل قادراً على استخدام الخدمة حتى ${data.endDate || "نهاية فترة الاشتراك الحالية"}.`
          : `You will still be able to use the service until ${data.endDate || "the end of your current billing period"}.`
      }
    </p>
    
    ${getButton(
      isAr ? "إعادة تفعيل الاشتراك" : "Reactivate Subscription",
      data.reactivateUrl,
      "primary"
    )}
    
    <p style="color: ${COLORS.text.muted}; font-size: 14px;">
      ${
        isAr
          ? "يمكنك إعادة تفعيل اشتراكك في أي وقت."
          : "You can reactivate your subscription at any time."
      }
    </p>
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "إلغاء الاشتراك" : "Subscription Cancelled",
    headerBgColor: COLORS.warning,
    preheader: isAr
      ? "تم إلغاء اشتراكك"
      : "Your subscription has been cancelled",
  });

  return { subject, html };
};

// ============================================
// USAGE LIMIT WARNING EMAIL
// ============================================

/**
 * Usage limit warning email
 * @param {Object} data - { userName, resourceType, used, limit, percentage, upgradeUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const usageLimitWarningEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const percentage =
    data.percentage || Math.round((data.used / data.limit) * 100);

  const resourceNames = {
    events: { ar: "الفعاليات", en: "Events" },
    guests: { ar: "الضيوف", en: "Guests" },
    messages: { ar: "الرسائل", en: "Messages" },
    storage: { ar: "التخزين", en: "Storage" },
  };

  const resourceName = resourceNames[data.resourceType] || {
    ar: data.resourceType,
    en: data.resourceType,
  };

  const subject = isAr
    ? `تنبيه: اقتربت من حد ${resourceName.ar}`
    : `Warning: Approaching ${resourceName.en} Limit`;

  const content = `
    ${getGreeting(data.userName, lang)}
    
    <div class="highlight-box warning-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.warning};">⚠️ ${
        isAr
          ? `استخدمت ${percentage}% من حد ${resourceName.ar}`
          : `You've used ${percentage}% of your ${resourceName.en} limit`
      }
      </p>
    </div>
    
    <div style="margin: 24px 0;">
      <p style="margin-bottom: 8px; font-size: 14px; color: ${COLORS.text.secondary};">
        ${isAr ? "الاستخدام الحالي:" : "Current Usage:"}
      </p>
      <div style="background: ${COLORS.background.footer}; border-radius: 8px; padding: 4px;">
        <div style="background: ${percentage >= 90 ? COLORS.error : COLORS.warning}; height: 12px; border-radius: 6px; width: ${percentage}%;"></div>
      </div>
      <p style="margin-top: 8px; font-size: 14px; text-align: center; color: ${COLORS.text.secondary};">
        ${data.used} / ${data.limit} ${isAr ? resourceName.ar : resourceName.en}
      </p>
    </div>
    
    <p>${
      isAr
        ? "قم بترقية اشتراكك للحصول على حدود أعلى."
        : "Upgrade your subscription to get higher limits."
    }
    </p>
    
    ${getButton(
      isAr ? "ترقية الاشتراك" : "Upgrade Subscription",
      data.upgradeUrl,
      "primary"
    )}`;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تنبيه الاستخدام" : "Usage Warning",
    headerBgColor: COLORS.warning,
    preheader: isAr
      ? `استخدمت ${percentage}% من حد ${resourceName.ar}`
      : `You've used ${percentage}% of your ${resourceName.en} limit`,
  });

  return { subject, html };
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  subscriptionAlertEmail,
  subscriptionCreatedEmail,
  subscriptionUpgradedEmail,
  subscriptionDowngradedEmail,
  paymentConfirmationEmail,
  paymentFailedEmail,
  subscriptionCancelledEmail,
  usageLimitWarningEmail,
};
