import { z } from "zod";
import { normalizeDigits } from "@halaa/shared/utils/locale";
import { toHalalas } from "@halaa/shared/utils/money";

export const normalizePaymentLinkAmount = (value) => normalizeDigits(String(value ?? "")).trim().replace(/٫/g, ".");

// Reject ambiguous input before the shared monetary conversion can round it.
export function paymentLinkFormSchema(config, t) {
  return z.object({
    amountSar: z.string().max(32).transform(normalizePaymentLinkAmount)
      .refine((v) => /^\d{1,7}(\.\d{1,2})?$/.test(v), t("links.create.amountInvalid", "Enter a valid amount with at most two decimal places"))
      .refine((v) => Number.isFinite(config.maxAmountSar) &&
        toHalalas(v) >= toHalalas(config.minAmountSar) && toHalalas(v) <= toHalalas(config.maxAmountSar),
      t("links.create.amountRange", "Enter an amount between SAR {{min}} and {{max}}", { min: config.minAmountSar, max: config.maxAmountSar })),
    description: z.string().trim().max(200, t("links.create.descriptionTooLong")),
    clientLabel: z.string().trim().max(100, t("links.create.clientLabelTooLong")),
    expiresInDays: z.coerce.number().int().refine((v) => (config.expiryChoicesDays || [1, 7, 30]).includes(v), t("links.create.expiryInvalid")),
  });
}
