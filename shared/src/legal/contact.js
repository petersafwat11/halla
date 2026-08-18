/**
 * Single source of truth for legal/brand contact identity (P1-06 / P1-07).
 *
 * Owner-confirmed identity and contact facts live here. Consumers must not
 * reintroduce hardcoded contact strings.
 *
 * Approved 2026-08-13: support@halaa.com.sa and +966552619282.
 * Official CR names confirmed 2026-08-13.
 */

export const LEGAL_CONTACT = Object.freeze({
  approved: true,
  legalEntityName: {
    approved: true,
    status: "OWNER_APPROVED",
    ar: "افاق هلا للاتصالات والمعلومات",
    en: "Afaq hala Company For Communications and Information",
    note: "Owner-confirmed exact Arabic CR name and official English translation.",
  },
  brandName: Object.freeze({ ar: "هلا", en: "Halaa" }),
  supportEmail: {
    approved: true,
    status: "OWNER_APPROVED",
    value: "support@halaa.com.sa",
    // Compatibility alias for existing consumers.
    provisional: "support@halaa.com.sa",
  },
  whatsapp: {
    approved: true,
    status: "OWNER_APPROVED",
    value: "+966552619282",
    display: "+966 55 261 9282",
    provisional: "+966552619282",
  },
  phone: {
    approved: true,
    status: "OWNER_APPROVED",
    value: "+966552619282",
    display: "+966 55 261 9282",
    provisional: "+966552619282",
  },
  postalAddress: {
    approved: true,
    status: "OWNER_APPROVED_REGISTERED_ADDRESS",
    provisional: {
      ar: "شارع المتحف - جدة - الرمز البريدي 23326",
      en: "Museum Street, Jeddah, Postal Code 23326, Saudi Arabia",
    },
    note: "Owner confirmed this is the registered legal address.",
  },
  responseSla: {
    approved: true,
    status: "OWNER_APPROVED_NO_PUBLISHED_HOURS_OR_NUMERIC_SLA",
    en: "Requests are reviewed as soon as reasonably possible and within any period required by applicable law.",
    ar: "تُراجع الطلبات في أقرب وقت ممكن بصورة معقولة وخلال أي مدة تفرضها الأنظمة المعمول بها.",
  },
  // Canonical public domain (infra-confirmed; used to build policy URLs).
  domain: "halaa.com.sa",
});

export default LEGAL_CONTACT;
