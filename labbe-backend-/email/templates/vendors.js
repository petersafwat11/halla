/**
 * Vendor Email Templates
 * Includes: Application Pending, Approval, Rejection, Profile Updates, Inquiries
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
// VENDOR APPLICATION PENDING EMAIL
// ============================================

/**
 * Vendor application pending email
 * @param {Object} data - { vendorName, brandName, email, category }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const vendorApplicationPendingEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? "تم استلام طلبك كمزود خدمة - هلا"
    : "Vendor Application Received - Halla";

  const content = `
    ${getGreeting(data.vendorName, lang)}
    
    <div class="highlight-box success-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.success};">
        ✓ ${isAr ? "تم استلام طلبك بنجاح!" : "Your application has been received!"}
      </p>
    </div>
    
    <p>${
      isAr
        ? "شكراً لتقديم طلبك كمزود خدمة في منصة هلا. تم استلام طلبك بنجاح وهو الآن قيد المراجعة من قبل فريقنا."
        : "Thank you for submitting your vendor application to Halla. Your application has been received and is now under review by our team."
    }
    </p>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "اسم العلامة التجارية" : "Brand Name", data.brandName)}
      ${getKeyValue(isAr ? "البريد الإلكتروني" : "Email", data.email)}
      ${data.category ? getKeyValue(isAr ? "التصنيف" : "Category", data.category) : ""}
      ${getKeyValue(isAr ? "حالة الطلب" : "Application Status", `<span style="color: ${COLORS.warning}; font-weight: 600;">${isAr ? "قيد المراجعة" : "Under Review"}</span>`)}
    `)}
    
    <p>${
      isAr
        ? "سنقوم بمراجعة طلبك وإخطارك بالنتيجة عبر البريد الإلكتروني في أقرب وقت ممكن. عادةً ما تستغرق عملية المراجعة من 1-3 أيام عمل."
        : "We will review your application and notify you of the result via email as soon as possible. The review process typically takes 1-3 business days."
    }
    </p>
    
    <div class="highlight-box info-box">
      <p style="margin: 0; font-size: 14px;">
        <strong>${isAr ? "ماذا بعد؟" : "What's next?"}</strong><br/>
        ${
          isAr
            ? "بمجرد الموافقة على طلبك، ستتمكن من الوصول إلى لوحة التحكم الخاصة بك وبدء عرض خدماتك للعملاء."
            : "Once your application is approved, you'll be able to access your dashboard and start showcasing your services to customers."
        }
      </p>
    </div>
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تم استلام طلبك!" : "Application Received!",
    headerBgColor: COLORS.success,
    preheader: isAr
      ? "تم استلام طلبك كمزود خدمة بنجاح"
      : "Your vendor application has been received",
  });

  return { subject, html };
};

// ============================================
// VENDOR APPROVAL EMAIL
// ============================================

/**
 * Vendor approval email
 * @param {Object} data - { vendorName, brandName, dashboardUrl, setupPasswordUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const vendorApprovalEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? "تهانينا! تمت الموافقة على حسابك - هلا"
    : "Congratulations! Your Account is Approved - Halla";

  const content = `
    ${getGreeting(data.vendorName, lang)}
    
    <div class="highlight-box success-box">
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: ${COLORS.success};">
        🎉 ${isAr ? "تمت الموافقة على حسابك!" : "Your account has been approved!"}
      </p>
    </div>
    
    <p>${
      isAr
        ? `تهانينا! تمت الموافقة على حسابك كمزود خدمة لعلامة "${data.brandName}" التجارية. يمكنك الآن البدء في عرض خدماتك والتواصل مع العملاء.`
        : `Congratulations! Your vendor account for "${data.brandName}" has been approved. You can now start showcasing your services and connecting with customers.`
    }
    </p>
    
    ${
      data.setupPasswordUrl
        ? `
      <p><strong>${isAr ? "الخطوة التالية:" : "Next Step:"}</strong></p>
      <p>${
        isAr
          ? "قم بإعداد كلمة المرور الخاصة بك للوصول إلى لوحة التحكم:"
          : "Set up your password to access your dashboard:"
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
            data.dashboardUrl,
            "success"
          )
    }
    
    <div class="divider"></div>
    
    <p><strong>${isAr ? "ما يمكنك فعله الآن:" : "What you can do now:"}</strong></p>
    <ul style="color: ${COLORS.text.secondary}; padding-${isAr ? "right" : "left"}: 20px;">
      <li>${isAr ? "أكمل ملفك الشخصي وأضف صور لأعمالك" : "Complete your profile and add photos of your work"}</li>
      <li>${isAr ? "حدد خدماتك وأسعارك" : "Set up your services and pricing"}</li>
      <li>${isAr ? "ابدأ في استقبال الاستفسارات من العملاء" : "Start receiving inquiries from customers"}</li>
    </ul>
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تمت الموافقة على حسابك!" : "Account Approved!",
    headerBgColor: COLORS.success,
    preheader: isAr
      ? "تهانينا! تمت الموافقة على حسابك كمزود خدمة"
      : "Congratulations! Your vendor account has been approved",
  });

  return { subject, html };
};

// ============================================
// VENDOR REJECTION EMAIL
// ============================================

/**
 * Vendor rejection email
 * @param {Object} data - { vendorName, brandName, reason, supportEmail, reapplyUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const vendorRejectionEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const config = getConfig();

  const subject = isAr
    ? "تحديث حالة طلبك - هلا"
    : "Application Status Update - Halla";

  const content = `
    ${getGreeting(data.vendorName, lang)}
    
    <p>${
      isAr
        ? `شكراً لاهتمامك بالانضمام إلى منصة هلا كمزود خدمة لعلامة "${data.brandName}" التجارية.`
        : `Thank you for your interest in joining Halla as a vendor for "${data.brandName}".`
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
      <p style="color: ${COLORS.text.secondary}; background: ${COLORS.background.footer}; padding: 16px; border-radius: 8px;">
        ${data.reason}
      </p>
    `
        : ""
    }
    
    <p>${
      isAr
        ? "إذا كنت تعتقد أن هذا القرار خاطئ أو لديك معلومات إضافية ترغب في مشاركتها، يرجى التواصل مع فريق الدعم."
        : "If you believe this decision was made in error or have additional information you'd like to share, please contact our support team."
    }
    </p>
    
    ${getButton(
      isAr ? "تواصل مع الدعم" : "Contact Support",
      `mailto:${data.supportEmail || config.supportEmail}`,
      "outline"
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
      </p>${getButton(
        isAr ? "إعادة تقديم الطلب" : "Reapply",
        data.reapplyUrl,
        "secondary"
      )}
    `
        : ""
    }
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تحديث حالة الطلب" : "Application Status Update",
    headerBgColor: COLORS.warning,
    preheader: isAr
      ? "تحديث بخصوص طلبك كمزود خدمة"
      : "Update regarding your vendor application",
  });

  return { subject, html };
};

// ============================================
// VENDOR PROFILE UPDATE EMAIL
// ============================================

/**
 * Vendor profile update notification email
 * @param {Object} data - { vendorName, brandName, changes, profileUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const vendorProfileUpdateEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? "تم تحديث ملفك الشخصي"
    : "Profile Updated Successfully";

  const changesHtml =
    data.changes && data.changes.length > 0
      ? `<ul style="color: ${COLORS.text.secondary}; padding-${isAr ? "right" : "left"}: 20px;">
        ${data.changes.map((change) => `<li>${change}</li>`).join("")}
      </ul>`
      : "";

  const content = `
    ${getGreeting(data.vendorName, lang)}
    
    <div class="highlight-box success-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.success};">
        ✓ ${isAr ? "تم تحديث ملفك الشخصي بنجاح" : "Your profile has been updated successfully"}
      </p>
    </div>
    
    ${
      changesHtml
        ? `
      <p><strong>${isAr ? "التغييرات:" : "Changes made:"}</strong></p>
      ${changesHtml}
    `
        : ""
    }
    
    ${getButton(isAr ? "عرض الملف الشخصي" : "View Profile", data.profileUrl)}
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تحديث الملف الشخصي" : "Profile Updated",
    headerBgColor: COLORS.success,
    preheader: isAr
      ? "تم تحديث ملفك الشخصي بنجاح"
      : "Your profile has been updated successfully",
  });

  return { subject, html };
};

// ============================================
// NEW INQUIRY EMAIL
// ============================================

/**
 * New inquiry notification email for vendors
 * @param {Object} data - { vendorName, customerName, customerPhone, customerEmail, message, eventType, eventDate, inquiryUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const vendorNewInquiryEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `استفسار جديد من ${data.customerName}`
    : `New Inquiry from ${data.customerName}`;

  const content = `
    ${getGreeting(data.vendorName, lang)}
    
    <div class="highlight-box info-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.info};">
        📩 ${isAr ? "لديك استفسار جديد!" : "You have a new inquiry!"}
      </p>
    </div>
    
    <p>${
      isAr
        ? `تلقيت استفساراً جديداً من ${data.customerName}.`
        : `You received a new inquiry from ${data.customerName}.`
    }
    </p>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "اسم العميل" : "Customer Name", data.customerName)}
      ${data.customerPhone ? getKeyValue(isAr ? "رقم الهاتف" : "Phone", data.customerPhone) : ""}
      ${data.customerEmail ? getKeyValue(isAr ? "البريد الإلكتروني" : "Email", data.customerEmail) : ""}
      ${data.eventType ? getKeyValue(isAr ? "نوع المناسبة" : "Event Type", data.eventType) : ""}
      ${data.eventDate ? getKeyValue(isAr ? "تاريخ المناسبة" : "Event Date", data.eventDate) : ""}
    `)}
    
    ${
      data.message
        ? `
      <p><strong>${isAr ? "الرسالة:" : "Message:"}</strong></p>
      <div style="background: ${COLORS.background.footer}; padding: 16px; border-radius: 8px; color: ${COLORS.text.secondary};">
        ${data.message}
      </div>
    `
        : ""
    }
    
    ${getButton(
      isAr ? "الرد على الاستفسار" : "Respond to Inquiry",
      data.inquiryUrl
    )}
    <p style="color: ${COLORS.text.secondary}; font-size: 14px;">
      ${
        isAr
          ? "ننصح بالرد على الاستفسارات في أسرع وقت ممكن لزيادة فرص الحصول على العميل."
          : "We recommend responding to inquiries as soon as possible to increase your chances of winning the customer."
      }
    </p>
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "استفسار جديد" : "New Inquiry",
    headerBgColor: COLORS.info,
    preheader: isAr
      ? `استفسار جديد من ${data.customerName}`
      : `New inquiry from ${data.customerName}`,
  });

  return { subject, html };
};

// ============================================
// VENDOR REVIEW NOTIFICATION EMAIL
// ============================================

/**
 * New review notification email for vendors
 * @param {Object} data - { vendorName, reviewerName, rating, review, eventTitle, profileUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const vendorNewReviewEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";

  const subject = isAr
    ? `تقييم جديد من ${data.reviewerName}`
    : `New Review from ${data.reviewerName}`;

  // Generate star rating display
  const stars = "★".repeat(data.rating) + "☆".repeat(5 - data.rating);
  const ratingColor =
    data.rating >= 4
      ? COLORS.success
      : data.rating >= 3
        ? COLORS.warning
        : COLORS.error;

  const content = `
    ${getGreeting(data.vendorName, lang)}
    
    <div class="highlight-box ${data.rating >= 4 ? "success-box" : data.rating >= 3 ? "warning-box" : "error-box"}">
      <p style="margin: 0; font-size: 16px; font-weight: 600;">
        ⭐ ${isAr ? "لديك تقييم جديد!" : "You have a new review!"}
      </p>
    </div>
    
    <div style="text-align: center; margin: 24px 0;">
      <p style="font-size: 32px; margin: 0; color: ${ratingColor};">${stars}</p>
      <p style="font-size: 14px; color: ${COLORS.text.secondary}; margin: 8px 0 0;">
        ${data.rating}/5 ${isAr ? "نجوم" : "stars"}
      </p>
    </div>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "من" : "From", data.reviewerName)}
      ${data.eventTitle ? getKeyValue(isAr ? "المناسبة" : "Event", data.eventTitle) : ""}
    `)}
    
    ${
      data.review
        ? `
      <p><strong>${isAr ? "التقييم:" : "Review:"}</strong></p>
      <div style="background: ${COLORS.background.footer}; padding: 16px; border-radius: 8px; color: ${COLORS.text.secondary}; font-style: italic;">
        "${data.review}"
      </div>
    `
        : ""
    }
    
    ${getButton(
      isAr ? "عرض جميع التقييمات" : "View All Reviews",
      data.profileUrl
    )}`;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تقييم جديد" : "New Review",
    headerBgColor: ratingColor,
    preheader: isAr
      ? `تقييم ${data.rating} نجوم من ${data.reviewerName}`
      : `${data.rating}-star review from ${data.reviewerName}`,
  });

  return { subject, html };
};

// ============================================
// VENDOR ACCOUNT SUSPENDED EMAIL
// ============================================

/**
 * Vendor account suspended email
 * @param {Object} data - { vendorName, brandName, reason, supportEmail }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const vendorAccountSuspendedEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const config = getConfig();

  const subject = isAr ? "تم تعليق حسابك - هلا" : "Account Suspended - Halla";

  const content = `
    ${getGreeting(data.vendorName, lang)}
    
    <div class="highlight-box error-box">
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${COLORS.error};">
        ⚠️ ${isAr ? "تم تعليق حسابك" : "Your account has been suspended"}
      </p>
    </div>
    
    <p>${
      isAr
        ? `نود إعلامك بأنه تم تعليق حساب مزود الخدمة الخاص بعلامة "${data.brandName}" التجارية.`
        : `We would like to inform you that your vendor account for "${data.brandName}" has been suspended.`
    }
    </p>
    
    ${
      data.reason
        ? `
      <p><strong>${isAr ? "السبب:" : "Reason:"}</strong></p>
      <div style="background: ${COLORS.errorBg}; padding: 16px; border-radius: 8px; color: ${COLORS.text.secondary};">
        ${data.reason}
      </div>
    `
        : ""
    }
    <p>${
      isAr
        ? "إذا كنت تعتقد أن هذا خطأ أو ترغب في استئناف القرار، يرجى التواصل مع فريق الدعم."
        : "If you believe this is an error or would like to appeal this decision, please contact our support team."
    }
    </p>
    
    ${getButton(
      isAr ? "تواصل مع الدعم" : "Contact Support",
      `mailto:${data.supportEmail || config.supportEmail}`,
      "primary"
    )}
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تعليق الحساب" : "Account Suspended",
    headerBgColor: COLORS.error,
    preheader: isAr
      ? "تم تعليق حسابك كمزود خدمة"
      : "Your vendor account has been suspended",
  });

  return { subject, html };
};

// ============================================
// VENDOR WEEKLY STATS EMAIL
// ============================================

/**
 * Vendor weekly stats email
 * @param {Object} data - { vendorName, weekRange, stats, dashboardUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const vendorWeeklyStatsEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const stats = data.stats || {};

  const subject = isAr
    ? `تقريرك الأسبوعي - ${data.weekRange}`
    : `Your Weekly Report - ${data.weekRange}`;

  const content = `
    ${getGreeting(data.vendorName, lang)}
    
    <p>${
      isAr
        ? "إليك ملخص نشاطك هذا الأسبوع:"
        : "Here's your activity summary for this week:"
    }
    </p>
    
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
        value: stats.reviews || 0,
        label: isAr ? "تقييمات" : "Reviews",
        variant: "warning",
      },
    ])}
    
    ${
      stats.averageRating
        ? `
      <p style="text-align: center; margin: 16px 0;">
        ${isAr ? "متوسط التقييم:" : "Average Rating:"} 
        <span style="font-size: 24px; font-weight: bold; color: ${COLORS.warning};">
          ${stats.averageRating} ⭐
        </span>
      </p>
    `
        : ""
    }
    
    ${getButton(isAr ? "عرض لوحة التحكم" : "View Dashboard", data.dashboardUrl)}
    <p style="color: ${COLORS.text.secondary}; font-size: 14px; text-align: center;">
      ${
        isAr
          ? "استمر في تحسين ملفك الشخصي لجذب المزيد من العملاء!"
          : "Keep improving your profile to attract more customers!"
      }
    </p>
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
// EXPORTS
// ============================================

module.exports = {
  vendorApplicationPendingEmail,
  vendorApprovalEmail,
  vendorRejectionEmail,
  vendorProfileUpdateEmail,
  vendorNewInquiryEmail,
  vendorNewReviewEmail,
  vendorAccountSuspendedEmail,
  vendorWeeklyStatsEmail,
};
