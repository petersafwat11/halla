const { z } = require("zod");
const {
  REPORT_TARGET_TYPES,
  REPORT_REASONS,
  MODERATION_ACTIONS,
} = require("../../../models/ReportModel");

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const actorType = z.enum(["user", "guest"]);

const acceptPoliciesSchema = z.object({
  documents: z.array(z.enum(["terms", "community", "privacy"])).optional(),
  locale: z.enum(["ar", "en"]).optional(),
});

const reportSchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: objectId,
  reportedActorType: actorType.optional(),
  reportedActorId: objectId.optional(),
  contextEventId: objectId.optional(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().max(2000).optional(),
  snapshot: z
    .object({
      text: z.string().max(4000).optional(),
      mediaUrl: z.string().max(1000).optional(),
    })
    .optional(),
});

const blockSchema = z.object({
  blockedActorType: actorType,
  blockedActorId: objectId,
  contextEventId: objectId.optional(),
});

const unblockSchema = z.object({
  blockedActorType: actorType,
  blockedActorId: objectId,
});

const approvalSchema = z.object({
  approve: z.boolean(),
});

const actionSchema = z.object({
  action: z.enum(MODERATION_ACTIONS),
  note: z.string().max(2000).optional(),
});

module.exports = {
  acceptPoliciesSchema,
  reportSchema,
  blockSchema,
  unblockSchema,
  approvalSchema,
  actionSchema,
};
