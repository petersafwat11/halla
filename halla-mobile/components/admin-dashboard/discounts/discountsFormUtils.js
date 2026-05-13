// Canonical plan types — must match backend `shared/constants/plans.js`.
export const PLAN_TYPES = [
  "basic_event",
  "basic_monthly",
  "premium_event",
  "premium_monthly",
  "business_event",
  "business_quarterly",
  "business_annual",
];

const toUtcMidnightIso = (d) => {
  if (!d) return undefined;
  const date = d instanceof Date ? d : new Date(d);
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  ).toISOString();
};

export function buildPayload(form) {
  return {
    code: form.code?.trim().toUpperCase(),
    descriptionEn: form.descriptionEn?.trim() || undefined,
    descriptionAr: form.descriptionAr?.trim() || undefined,
    discountType: form.discountType,
    value: Number(form.value),
    maxUses: Number(form.maxUses) || 0,
    minimumAmount: Number(form.minimumAmount) || 0,
    validFrom: toUtcMidnightIso(form.validFrom),
    validUntil: toUtcMidnightIso(form.validUntil),
    isActive: form.isActive,
    applicablePlanTypes: form.applicablePlanTypes || [],
  };
}
