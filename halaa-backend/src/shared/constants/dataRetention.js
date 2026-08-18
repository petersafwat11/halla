/**
 * Account-deletion data-retention matrix (SHIP §4.1 / decision D5).
 *
 * Declares what Halaa RETAINS (pseudonymized) after a user deletes their
 * account, and why. Everything NOT listed here is deleted or anonymized by the
 * deletion service. This is intentionally data-only + configurable so legal can
 * adjust the list, reasons, and durations WITHOUT code changes.
 *
 * `LEGAL_FINALIZED` stays false until legal signs off on the exact list (D5);
 * the disclosure is surfaced to the user in the in-app deletion UI, the public
 * /delete-account page, and the privacy policy.
 */

const operations = require("../legal/privacyOperations.generated.json");

// Compatibility view used by the deletion disclosure/API. Durations now come
// from the generated owner-approved operations contract, never hand-maintained.
const RETAINED = operations.retentionRules.map((rule) => ({
  collection: rule.collection,
  reason: rule.legalBasis,
  durationDays: rule.durationDays || rule.durationYears * 365,
  durationYears: rule.durationYears || null,
  retentionAnchor: rule.retentionAnchor,
  pseudonymized: true,
  policyRuleId: rule.id,
}));

// Flip via env once legal confirms the retained-field list/reasons/durations.
const LEGAL_FINALIZED = process.env.RETENTION_MATRIX_FINALIZED === "true";

// User-facing disclosure (AR/EN) for the deletion UI + /delete-account page.
const DISCLOSURE = {
  en:
    "After deletion we permanently remove your personal data (profile, events, guests, photos, comments, tickets, and notifications). For legal, tax, and anti-fraud reasons we keep pseudonymized financial and audit records (payments, subscriptions, audit logs) for the period required by law; these are not linked to restorable personal identifiers.",
  ar:
    "بعد الحذف نزيل بياناتك الشخصية نهائيًا (الملف الشخصي والمناسبات والضيوف والصور والتعليقات والتذاكر والإشعارات). ولأسباب قانونية وضريبية ومكافحة الاحتيال نحتفظ بسجلات مالية وتدقيقية مجهّلة الهوية (المدفوعات والاشتراكات وسجلات التدقيق) للمدة التي يفرضها القانون، وهي غير مرتبطة بمعرّفات شخصية قابلة للاستعادة.",
};

module.exports = {
  RETAINED,
  LEGAL_FINALIZED,
  DISCLOSURE,
  POLICY_HASH: operations.policyHash,
  POLICY_VERSION: operations.policyVersion,
};
