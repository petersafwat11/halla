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
    }
  });

export const parseInvitationBalance = (value) => invitationBalanceSchema.parse(value);
