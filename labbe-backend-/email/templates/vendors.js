/**
 * Vendor Email Templates
 * Includes: Application Pending, Approval, Rejection.
 * All other vendor emails (profile updates, inquiries, reviews,
 * suspensions, weekly stats) were removed with the vendor notification
 * preferences UI.
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
// EXPORTS
// ============================================

module.exports = {
  vendorApplicationPendingEmail,
  vendorApprovalEmail,
  vendorRejectionEmail,
};
