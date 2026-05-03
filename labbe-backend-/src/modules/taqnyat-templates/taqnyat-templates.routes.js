/**
 * Taqnyat Templates Routes — Phase 4c W0-MODEL
 *
 * Two route trees mounted at different prefixes:
 *
 *   /api/v2/taqnyat-templates
 *     - GET /             host-facing list, filtered by ?category=…
 *
 *   /api/v2/admin/taqnyat-templates  (mounted via admin.routes)
 *     - GET /
 *     - POST /sync        (super-admin only — Meta upstream call)
 *     - PATCH /:id        category + varMapping + active + sortOrder
 *
 * RBAC mirrors the page-level access matrix from `permissions.js`
 * (`taqnyat_templates`):
 *   super_admin / admin = FULL,
 *   moderator           = NONE,
 *   whitelabel*         = NONE,
 *   host                = NONE on admin scope, allowed on the public scope.
 */

const express = require("express");
const router = express.Router();

const { protect } = require("../../shared/middleware/auth");
const { requirePageAccess, superAdminOnly } = require("../../shared/middleware/rbac");
const { validateObjectId } = require("../../shared/middleware/validation");
const { ADMIN_PAGES } = require("../../shared/constants");

const controller = require("./taqnyat-templates.controller");

// Public host-facing list — auth required (host gating happens at the
// wizard level; we still want the user authenticated to avoid leaking
// our curated catalogue to the world).
router.use(protect);
router.get("/", controller.listForHost);

// Admin sub-router — mounted at /admin/taqnyat-templates by the caller.
const adminRouter = express.Router();
adminRouter.use(protect);
adminRouter.get(
  "/",
  requirePageAccess(ADMIN_PAGES.TAQNYAT_TEMPLATES, "view"),
  controller.listForAdmin
);
adminRouter.post(
  "/sync",
  superAdminOnly,
  controller.sync
);
adminRouter.patch(
  "/:id",
  validateObjectId("id"),
  requirePageAccess(ADMIN_PAGES.TAQNYAT_TEMPLATES, "update"),
  controller.assignMapping
);

module.exports = router;
module.exports.adminRouter = adminRouter;
