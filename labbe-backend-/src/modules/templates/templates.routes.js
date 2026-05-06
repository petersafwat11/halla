/**
 * Templates Routes — Phase 4c W0-VISUAL-BACKEND
 *
 * Exports:
 *   - module.exports                = host-facing /templates router
 *   - module.exports.adminRouter    = admin /admin/templates router
 *   - module.exports.categoriesRouter (host) + adminCategoriesRouter
 *   - module.exports.fontsRouter
 *
 * Mounted by `src/app.js` under matching prefixes.
 */

const express = require("express");
const rateLimit = require("express-rate-limit");
const multer = require("multer");

const { protect } = require("../../shared/middleware/auth");
const { requirePageAccess } = require("../../shared/middleware/rbac");
const { validateObjectId } = require("../../shared/middleware/validation");
const { ADMIN_PAGES } = require("../../shared/constants");
const controller = require("./templates.controller");

// ── Host-facing /templates ──────────────────────────────────────────────────
const hostRouter = express.Router();
hostRouter.use(protect);
hostRouter.get("/", controller.list);
hostRouter.get("/:id", validateObjectId("id"), controller.getById);

// ── Admin /admin/templates ──────────────────────────────────────────────────
//
// Per v4.1 §A-10: upload-url is rate-limited (30/hr per user). The other
// admin endpoints inherit standard global rate limits.
const uploadUrlLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => (req.user?._id || req.ip).toString(),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "RATE_LIMIT_EXCEEDED" },
});

const memUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    /^image\/(jpeg|png|webp)$/.test(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only jpeg, png, webp images are allowed")),
});

const adminRouter = express.Router();
adminRouter.use(protect);

adminRouter.get(
  "/",
  requirePageAccess(ADMIN_PAGES.TEMPLATES, "view"),
  controller.adminList
);

adminRouter.post(
  "/upload-url",
  requirePageAccess(ADMIN_PAGES.TEMPLATES, "create"),
  uploadUrlLimiter,
  controller.adminGetUploadUrl
);

adminRouter.post(
  "/upload-image",
  requirePageAccess(ADMIN_PAGES.TEMPLATES, "create"),
  uploadUrlLimiter,
  memUpload.single("image"),
  controller.adminUploadImage
);

adminRouter.post(
  "/",
  requirePageAccess(ADMIN_PAGES.TEMPLATES, "create"),
  controller.adminCreate
);

adminRouter.get(
  "/:id",
  validateObjectId("id"),
  requirePageAccess(ADMIN_PAGES.TEMPLATES, "view"),
  controller.getById
);

adminRouter.put(
  "/:id",
  validateObjectId("id"),
  requirePageAccess(ADMIN_PAGES.TEMPLATES, "update"),
  controller.adminUpdate
);

adminRouter.post(
  "/:id/duplicate",
  validateObjectId("id"),
  requirePageAccess(ADMIN_PAGES.TEMPLATES, "create"),
  controller.adminDuplicate
);

adminRouter.delete(
  "/:id",
  validateObjectId("id"),
  requirePageAccess(ADMIN_PAGES.TEMPLATES, "delete"),
  controller.adminDelete
);

// ── Categories ──────────────────────────────────────────────────────────────
const categoriesRouter = express.Router();
categoriesRouter.get("/", controller.listCategories); // public, no auth per v4.1 §A-11

const adminCategoriesRouter = express.Router();
adminCategoriesRouter.use(protect);
adminCategoriesRouter.get(
  "/",
  requirePageAccess(ADMIN_PAGES.TEMPLATE_CATEGORIES, "view"),
  controller.adminListCategories
);
adminCategoriesRouter.post(
  "/",
  requirePageAccess(ADMIN_PAGES.TEMPLATE_CATEGORIES, "create"),
  controller.adminCreateCategory
);
adminCategoriesRouter.put(
  "/:id",
  validateObjectId("id"),
  requirePageAccess(ADMIN_PAGES.TEMPLATE_CATEGORIES, "update"),
  controller.adminUpdateCategory
);
adminCategoriesRouter.delete(
  "/:id",
  validateObjectId("id"),
  requirePageAccess(ADMIN_PAGES.TEMPLATE_CATEGORIES, "delete"),
  controller.adminDeleteCategory
);

// ── Fonts ───────────────────────────────────────────────────────────────────
const fontsRouter = express.Router();
fontsRouter.get("/", controller.listFonts);

module.exports = hostRouter;
module.exports.adminRouter = adminRouter;
module.exports.categoriesRouter = categoriesRouter;
module.exports.adminCategoriesRouter = adminCategoriesRouter;
module.exports.fontsRouter = fontsRouter;
