// Canonical plan types — must match backend `shared/constants/plans.js`.
// The chip labels are localized via `t("discounts.planTypes.<value>")`.
export const PLAN_TYPES = [
  "trial",
  "basic_event",
  "basic_monthly",
  "premium_event",
  "premium_monthly",
  "business_event",
  "business_quarterly",
  "business_annual",
  "unlimited",
];

export const EMPTY_FORM = {
  code: "",
  descriptionEn: "",
  descriptionAr: "",
  discountType: "percentage",
  value: "",
  maxUses: "",
  validFrom: "",
  validUntil: "",
  isActive: true,
  applicablePlanTypes: [],
  minimumAmount: "",
};

export function validateForm(form, t) {
  const e = {};
  if (!form.code.trim())
    e.code = t("discounts.validation.codeRequired", "الكود مطلوب");
  if (form.value === "" || form.value === null)
    e.value = t("discounts.validation.valueRequired", "القيمة مطلوبة");
  if (parseFloat(form.value) < 0)
    e.value = t("discounts.validation.valuePositive", "القيمة يجب أن تكون موجبة");
  if (form.discountType === "percentage" && parseFloat(form.value) > 100)
    e.value = t("discounts.validation.maxPercent", "النسبة لا تتجاوز 100%");
  if (
    form.validFrom &&
    form.validUntil &&
    new Date(form.validFrom) >= new Date(form.validUntil)
  )
    e.validUntil = t(
      "discounts.validation.dateRange",
      "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء"
    );
  return e;
}

export function buildPayload(form) {
  return {
    ...form,
    value: parseFloat(form.value),
    maxUses: form.maxUses !== "" ? parseInt(form.maxUses) : 0,
    minimumAmount: form.minimumAmount !== "" ? parseFloat(form.minimumAmount) : 0,
    validFrom: form.validFrom || undefined,
    validUntil: form.validUntil || undefined,
  };
}
