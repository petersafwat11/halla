/**
 * Canonical invitation-balance wire contract (PR4 / F-11).
 * Balance arithmetic belongs exclusively to the backend presenter.
 */
import { z } from "zod";

export const invitationBalanceSchema = z
  .object({
    unlimited: z.boolean(),
    base: z.number().int().nonnegative().nullable(),
    compensation: z.number().int().nonnegative().nullable(),
    consumed: z.number().int().nonnegative(),
    total: z.number().int().nonnegative().nullable(),
    remaining: z.number().int().nonnegative().nullable(),
    // Provenance split of `base` / `compensation` — how much the plan itself
    // granted vs. what was bought (extra-invite add-ons) or carried over from
    // a replaced business plan. Optional so a balance minted before the split
    // existed still parses; when present it must agree with the totals.
    planBase: z.number().int().nonnegative().nullable().optional(),
    extra: z.number().int().nonnegative().nullable().optional(),
    carried: z.number().int().nonnegative().nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const finiteKeys = ["base", "compensation", "total", "remaining"];
    const invalidUnlimited = value.unlimited && finiteKeys.some((key) => value[key] !== null);
    const invalidFinite = !value.unlimited && finiteKeys.some((key) => value[key] === null);
    if (invalidUnlimited || invalidFinite) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: value.unlimited
          ? "Unlimited balances must use null for finite quota fields"
          : "Finite balances must provide all quota fields",
      });
      return;
    }

    // The split must reconstruct the totals exactly, or a card would show
    // rows that don't add up to the number next to them.
    if (!value.unlimited && value.planBase != null && value.extra != null) {
      if (value.planBase + value.extra !== value.base) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["extra"],
          message: "planBase + extra must equal base",
        });
      }
    }
    if (!value.unlimited && value.carried != null && value.carried > value.compensation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["carried"],
        message: "carried cannot exceed compensation",
      });
    }
  });

export const parseInvitationBalance = (value) => invitationBalanceSchema.parse(value);
