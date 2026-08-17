/**
 * @swagger
 * tags:
 *   name: Moderation
 *   description: UGC policy acceptance, reporting, blocking, host approval, and the staff moderation queue (§6)
 */

const express = require("express");
const router = express.Router();

const controller = require("./moderation.controller");
const { protect } = require("../../shared/middleware/auth");
const { restrictTo } = require("../../shared/middleware/rbac");
const { validateZod, validateObjectId } = require("../../shared/middleware/validation");
const { reportLimiter } = require("../../shared/middleware/rateLimiter");
const { ROLES } = require("../../shared/constants");
const {
  acceptPoliciesSchema,
  reportSchema,
  blockSchema,
  unblockSchema,
  approvalSchema,
  actionSchema,
} = require("./moderation.validation");

router.use(protect);

// ── Policy acceptance ──────────────────────────────────────────────────────
router.get("/policies", controller.getPolicies);
router.post("/accept", validateZod(acceptPoliciesSchema), controller.acceptPolicies);

// ── Reporting + blocking (any authenticated UGC viewer) ────────────────────
router.post("/report", reportLimiter, validateZod(reportSchema), controller.report);
router.post("/block", validateZod(blockSchema), controller.block);
router.delete("/block", validateZod(unblockSchema), controller.unblock);
router.get("/blocks", controller.listBlocks);

// ── Host approve/reject pending guest comments on their own event ──────────
router.get(
  "/events/:eventId/pending-comments",
  validateObjectId("eventId"),
  controller.listPendingComments
);
router.post(
  "/events/:eventId/comments/:commentId/approval",
  validateObjectId("eventId"),
  validateObjectId("commentId"),
  validateZod(approvalSchema),
  controller.setCommentApproval
);

// ── Staff moderation queue (least-privilege: moderator/admin) ──────────────
const staff = express.Router();
staff.use(restrictTo(ROLES.MODERATOR, ROLES.ADMIN, ROLES.SUPER_ADMIN));
staff.get("/reports", controller.listReports);
staff.get("/reports/:id", validateObjectId("id"), controller.getReport);
staff.post(
  "/reports/:id/action",
  validateObjectId("id"),
  validateZod(actionSchema),
  controller.actOnReport
);
router.use("/admin", staff);

module.exports = router;
