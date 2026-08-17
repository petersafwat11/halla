/**
 * Authentication Email Templates
 * Includes: Welcome, Password Reset, Password Setup, Email Verification, Account Activation
 */

const {
  getBaseLayout,
  getGreeting,
  getButton,
  getHighlightBox,
  getKeyValue,
  COLORS,
} = require("../layout");
const { getConfig } = require("../config");

// ============================================
// WELCOME EMAIL
// ============================================

/**
 * Welcome email for new users
 * @param {Object} data - { name, email, dashboardUrl, role }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const welcomeEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const config = getConfig();

  const subject = isAr ? "مرحباً بك في هلا!" : "Welcome to Halaa!";

  const roleMessages = {
    host: {
      ar: "يمكنك الآن البدء في إنشاء فعالياتك وإدارة ضيوفك بكل سهولة.",
      en: "You can now start creating your events and managing your guests with ease.",
    },
    vendor: {
      ar: "يمكنك الآن البدء في عرض خدماتك والتواصل مع العملاء.",
      en: "You can now start showcasing your services and connecting with customers.",
    },
    default: {
      ar: "يمكنك الآن البدء في استخدام جميع ميزات المنصة.",
      en: "You can now start using all platform features.",
    },
  };

  const roleMessage = roleMessages[data.role] || roleMessages.default;

  const content = `
    ${getGreeting(data.name, lang)}
    <p>${isAr ? "نحن سعداء بانضمامك إلينا!" : "We're excited to have you join us!"}</p>
    <p>${isAr ? roleMessage.ar : roleMessage.en}</p>
    
    ${getHighlightBox(`
      ${getKeyValue(isAr ? "البريد الإلكتروني" : "Email", data.email)}
      ${data.role ? getKeyValue(isAr ? "نوع الحساب" : "Account Type", isAr ? getRoleNameAr(data.role) : getRoleNameEn(data.role)) : ""}
    `)}
    
    ${getButton(
      isAr ? "ابدأ الآن" : "Get Started",
      data.dashboardUrl || `${config.baseUrl}/login`
    )}
    <p style="color: ${COLORS.text.secondary}; font-size: 14px;">
      ${
        isAr
          ? "إذا كان لديك أي استفسار، لا تتردد في التواصل مع فريق الدعم."
          : "If you have any questions, don't hesitate to contact our support team."
      }
    </p>
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "مرحباً بك في هلا!" : "Welcome to Halaa!",
    preheader: isAr
      ? "نحن سعداء بانضمامك إلينا"
      : "We're excited to have you join us",
  });

  return { subject, html };
};

// ============================================
// PASSWORD RESET EMAIL
// ============================================

/**
 * Password reset request email
 * @param {Object} data - { name, resetUrl, expiresIn }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const passwordResetEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const expiresIn = data.expiresIn || "10";

  const subject = isAr ? "إعادة تعيين كلمة المرور" : "Password Reset Request";

  const content = `
    ${getGreeting(data.name, lang)}
    <p>${
      isAr
        ? "لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك."
        : "We received a request to reset your account password."
    }
    </p>
    <p>${
      isAr
        ? "اضغط على الزر أدناه لإنشاء كلمة مرور جديدة:"
        : "Click the button below to create a new password:"
    }
    </p>
    
    ${getButton(
      isAr ? "إعادة تعيين كلمة المرور" : "Reset Password",
      data.resetUrl
    )}
    
    <div class="highlight-box warning-box">
      <p style="margin: 0; color: ${COLORS.warning};">
        ⚠️ ${
          isAr
            ? `تنتهي صلاحية هذا الرابط خلال ${expiresIn} دقائق.`
            : `This link expires in ${expiresIn} minutes.`
        }
      </p>
    </div>
    
    <p style="color: ${COLORS.text.secondary}; font-size: 14px;">
      ${
        isAr
          ? "إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد الإلكتروني بأمان."
          : "If you didn't request a password reset, you can safely ignore this email."
      }
    </p>
    <p style="color: ${COLORS.text.muted}; font-size: 12px;">
      ${
        isAr
          ? "لأسباب أمنية، لا تشارك هذا الرابط مع أي شخص."
          : "For security reasons, do not share this link with anyone."
      }
    </p>
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "إعادة تعيين كلمة المرور" : "Password Reset",
    headerBgColor: COLORS.warning,
    preheader: isAr ? "طلب إعادة تعيين كلمة المرور" : "Password reset request",
  });

  return { subject, html };
};

// ============================================
// EMAIL VERIFICATION
// ============================================

/**
 * Email verification email
 * @param {Object} data - { name, verificationUrl, expiresIn }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const emailVerificationEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const expiresIn = data.expiresIn || "24";

  const subject = isAr ? "تأكيد بريدك الإلكتروني" : "Verify Your Email Address";

  const content = `
    ${getGreeting(data.name, lang)}
    <p>${
      isAr
        ? "شكراً لتسجيلك! يرجى تأكيد بريدك الإلكتروني للمتابعة."
        : "Thank you for signing up! Please verify your email address to continue."
    }
    </p>
    
    ${getButton(
      isAr ? "تأكيد البريد الإلكتروني" : "Verify Email",
      data.verificationUrl,
      "primary"
    )}
    
    <p style="color: ${COLORS.text.secondary}; font-size: 14px;">
      ${
        isAr
          ? `هذا الرابط صالح لمدة ${expiresIn} ساعة.`
          : `This link is valid for ${expiresIn} hours.`
      }
    </p>
    
    <p style="color: ${COLORS.text.muted}; font-size: 12px;">
      ${
        isAr
          ? "إذا لم تقم بإنشاء حساب، يمكنك تجاهل هذا البريد الإلكتروني."
          : "If you didn't create an account, you can ignore this email."
      }
    </p>
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تأكيد البريد الإلكتروني" : "Email Verification",
    headerBgColor: COLORS.info,
    preheader: isAr
      ? "يرجى تأكيد بريدك الإلكتروني"
      : "Please verify your email address",
  });

  return { subject, html };
};

// ============================================
// PASSWORD CHANGED NOTIFICATION
// ============================================

/**
 * Password changed notification email
 * @param {Object} data - { name, changedAt, ipAddress, deviceInfo }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const passwordChangedEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const config = getConfig();

  const subject = isAr
    ? "تم تغيير كلمة المرور"
    : "Password Changed Successfully";

  const changedAt = data.changedAt
    ? new Date(data.changedAt).toLocaleString(isAr ? "ar-SA" : "en-US")
    : new Date().toLocaleString(isAr ? "ar-SA" : "en-US");

  const content = `
    ${getGreeting(data.name, lang)}
    <div class="highlight-box success-box">
      <p style="margin: 0; font-weight: 600; color: ${COLORS.success};">
        ✓ ${isAr ? "تم تغيير كلمة المرور بنجاح" : "Your password has been changed successfully"}
      </p>
    </div>
    
    <p>${
      isAr
        ? "نود إعلامك بأنه تم تغيير كلمة المرور الخاصة بحسابك."
        : "We wanted to let you know that your account password has been changed."
    }
    </p>
    
    ${getHighlightBox(
      `
      ${getKeyValue(isAr ? "التاريخ والوقت" : "Date & Time", changedAt)}
      ${data.ipAddress ? getKeyValue(isAr ? "عنوان IP" : "IP Address", data.ipAddress) : ""}
      ${data.deviceInfo ? getKeyValue(isAr ? "الجهاز" : "Device", data.deviceInfo) : ""}
    `,
      "info"
    )}
    
    <div class="highlight-box warning-box">
      <p style="margin: 0; font-size: 14px;">⚠️ ${
        isAr
          ? "إذا لم تقم بهذا التغيير، يرجى الاتصال بفريق الدعم فوراً وتغيير كلمة المرور."
          : "If you didn't make this change, please contact support immediately and change your password."
      }
      </p>
    </div>
    
    ${getButton(
      isAr ? "تواصل مع الدعم" : "Contact Support",
      `mailto:${config.supportEmail}`,
      "outline"
    )}
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تم تغيير كلمة المرور" : "Password Changed",
    headerBgColor: COLORS.success,
    preheader: isAr
      ? "تم تغيير كلمة المرور الخاصة بحسابك"
      : "Your account password has been changed",
  });

  return { subject, html };
};

// ============================================
// ACCOUNT DEACTIVATION
// ============================================

/**
 * Account deactivation notification email
 * @param {Object} data - { name, reason, reactivationUrl }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const accountDeactivatedEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const config = getConfig();

  const subject = isAr ? "تم تعليق حسابك" : "Your Account Has Been Suspended";

  const content = `
    ${getGreeting(data.name, lang)}
    
    <p>${
      isAr
        ? "نود إعلامك بأنه تم تعليق حسابك."
        : "We wanted to inform you that your account has been suspended."
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
    
    <p style="color: ${COLORS.text.secondary};">
      ${
        isAr
          ? "إذا كنت تعتقد أن هذا خطأ أو لديك أي استفسارات، يرجى التواصل مع فريق الدعم."
          : "If you believe this is an error or have any questions, please contact our support team."
      }
    </p>
    
    ${getButton(
      isAr ? "تواصل مع الدعم" : "Contact Support",
      `mailto:${config.supportEmail}`,
      "primary"
    )}
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تم تعليق الحساب" : "Account Suspended",
    headerBgColor: COLORS.error,
    preheader: isAr ? "تم تعليق حسابك" : "Your account has been suspended",
  });

  return { subject, html };
};

// ============================================
// LOGIN ALERT
// ============================================

/**
 * New login alert email
 * @param {Object} data - { name, loginAt, ipAddress, deviceInfo, location }
 * @param {string} lang - Language code (ar/en)
 * @returns {Object} { subject, html }
 */
const loginAlertEmail = (data, lang = "ar") => {
  const isAr = lang === "ar";
  const config = getConfig();

  const subject = isAr
    ? "تسجيل دخول جديد إلى حسابك"
    : "New Login to Your Account";

  const loginAt = data.loginAt
    ? new Date(data.loginAt).toLocaleString(isAr ? "ar-SA" : "en-US")
    : new Date().toLocaleString(isAr ? "ar-SA" : "en-US");

  const content = `
    ${getGreeting(data.name, lang)}
    
    <p>${
      isAr
        ? "تم تسجيل دخول جديد إلى حسابك."
        : "A new login was detected on your account."
    }
    </p>
    
    ${getHighlightBox(
      `
      ${getKeyValue(isAr ? "التاريخ والوقت" : "Date & Time", loginAt)}
      ${data.ipAddress ? getKeyValue(isAr ? "عنوان IP" : "IP Address", data.ipAddress) : ""}
      ${data.deviceInfo ? getKeyValue(isAr ? "الجهاز" : "Device", data.deviceInfo) : ""}
      ${data.location ? getKeyValue(isAr ? "الموقع" : "Location", data.location) : ""}
    `,
      "info"
    )}
    
    <p style="color: ${COLORS.text.secondary}; font-size: 14px;">
      ${
        isAr
          ? "إذا كان هذا أنت، يمكنك تجاهل هذا البريد الإلكتروني."
          : "If this was you, you can ignore this email."
      }
    </p>
    
    <div class="highlight-box warning-box">
      <p style="margin: 0; font-size: 14px;">
        ⚠️ ${
          isAr
            ? "إذا لم تقم بتسجيل الدخول، يرجى تغيير كلمة المرور فوراً والتواصل مع الدعم."
            : "If you didn't log in, please change your password immediately and contact support."
        }
      </p>
    </div>
    
    ${getButton(
      isAr ? "تغيير كلمة المرور" : "Change Password",
      `${config.baseUrl}/change-password`,
      "warning"
    )}
  `;

  const html = getBaseLayout(content, {
    lang,
    headerTitle: isAr ? "تنبيه تسجيل دخول" : "Login Alert",
    headerBgColor: COLORS.info,
    preheader: isAr
      ? "تم تسجيل دخول جديد إلى حسابك"
      : "New login detected on your account",
  });

  return { subject, html };
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get role name in Arabic
 * @param {string} role - Role code
 * @returns {string} Arabic role name
 */
const getRoleNameAr = (role) => {
  const roles = {
    host: "مضيف",
    vendor: "مزود خدمة",
    admin: "مدير",
    super_admin: "مدير عام",
  };
  return roles[role] || role;
};

/**
 * Get role name in English
 * @param {string} role - Role code
 * @returns {string} English role name
 */
const getRoleNameEn = (role) => {
  const roles = {
    host: "Host",
    vendor: "Vendor",
    admin: "Admin",
    super_admin: "Super Admin",
  };
  return roles[role] || role;
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  welcomeEmail,
  passwordResetEmail,
  emailVerificationEmail,
  passwordChangedEmail,
  accountDeactivatedEmail,
  loginAlertEmail,
  // Helpers
  getRoleNameAr,
  getRoleNameEn,
};
