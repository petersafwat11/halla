/**
 * @swagger
 * tags:
 *   - name: Templates
 *     description: Visual templates host-facing list and detail
 *   - name: AdminTemplates
 *     description: Admin CRUD for visual templates and image uploads
 *   - name: TemplateCategories
 *     description: Visual template categories (host + admin)
 *   - name: Fonts
 *     description: Public font registry consumed by template renderers
 */

const express = require("express");
const rateLimit = require("express-rate-limit");
const multer = require("multer");

const { protect } = require("../../shared/middleware/auth");
const { requirePageAccess } = require("../../shared/middleware/rbac");
const {
  validateObjectId,
  validateZod,
} = require("../../shared/middleware/validation");
const { ADMIN_PAGES } = require("../../shared/constants");
const controller = require("./templates.controller");
const {
  createTemplateSchema,
  updateTemplateSchema,
  createCategorySchema,
  updateCategorySchema,
  hostListQuerySchema,
  adminListQuerySchema,
} = require("./templates.validation");

// Rate-limit upload endpoints to mitigate S3 spend abuse (30/hr per user).
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

// ── Host-facing /templates ──────────────────────────────────────────────────
const hostRouter = express.Router();
hostRouter.use(protect);

/**
 * @swagger
 * /templates:
 *   get:
 *     summary: List active templates for hosts
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Optional category code to filter by
 *     responses:
 *       200:
 *         description: Template list
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TemplateListEnvelope' }
 */
hostRouter.get("/", validateZod(hostListQuerySchema, "query"), controller.list);

/**
 * @swagger
 * /templates/{id}:
 *   get:
 *     summary: Get a single template
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Template detail
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TemplateEnvelope' }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
hostRouter.get("/:id", validateObjectId("id"), controller.getById);

// ── Admin /admin/templates ──────────────────────────────────────────────────
const adminRouter = express.Router();
adminRouter.use(protect);

/**
 * @swagger
 * /admin/templates:
 *   get:
 *     summary: List templates (admin)
 *     tags: [AdminTemplates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: includeInactive
 *         schema: { type: string, enum: ['true', 'false'] }
 *       - in: query
 *         name: includeDeleted
 *         schema: { type: string, enum: ['true', 'false'] }
 *     responses:
 *       200:
 *         description: Template list
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TemplateListEnvelope' }
 */
adminRouter.get(
  "/",
  requirePageAccess(ADMIN_PAGES.TEMPLATES, "view"),
  validateZod(adminListQuerySchema, "query"),
  controller.adminList
);

/**
 * @swagger
 * /admin/templates/upload-image:
 *   post:
 *     summary: Upload a template image (proxy)
 *     tags: [AdminTemplates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: templateId
 *         schema: { type: string }
 *         description: Template id or "new"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Upload accepted, returns S3 key
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TemplateUploadImageEnvelope' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         description: Rate limit exceeded
 */
adminRouter.post(
  "/upload-image",
  requirePageAccess(ADMIN_PAGES.TEMPLATES, "create"),
  uploadUrlLimiter,
  memUpload.single("image"),
  controller.adminUploadImage
);

/**
 * @swagger
 * /admin/templates:
 *   post:
 *     summary: Create a template
 *     tags: [AdminTemplates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TemplateCreateInput' }
 *     responses:
 *       201:
 *         description: Template created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TemplateEnvelope' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
adminRouter.post(
  "/",
  requirePageAccess(ADMIN_PAGES.TEMPLATES, "create"),
  validateZod(createTemplateSchema),
  controller.adminCreate
);

/**
 * @swagger
 * /admin/templates/{id}:
 *   get:
 *     summary: Get a template (admin)
 *     tags: [AdminTemplates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Template detail
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TemplateEnvelope' }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
adminRouter.get(
  "/:id",
  validateObjectId("id"),
  requirePageAccess(ADMIN_PAGES.TEMPLATES, "view"),
  controller.getById
);

/**
 * @swagger
 * /admin/templates/{id}:
 *   put:
 *     summary: Update a template
 *     tags: [AdminTemplates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TemplateUpdateInput' }
 *     responses:
 *       200:
 *         description: Template updated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TemplateEnvelope' }
 *       409:
 *         description: Optimistic-lock conflict
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
adminRouter.put(
  "/:id",
  validateObjectId("id"),
  requirePageAccess(ADMIN_PAGES.TEMPLATES, "update"),
  validateZod(updateTemplateSchema),
  controller.adminUpdate
);

/**
 * @swagger
 * /admin/templates/{id}/duplicate:
 *   post:
 *     summary: Duplicate a template (creates inactive copy)
 *     tags: [AdminTemplates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       201:
 *         description: Template duplicated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TemplateEnvelope' }
 */
adminRouter.post(
  "/:id/duplicate",
  validateObjectId("id"),
  requirePageAccess(ADMIN_PAGES.TEMPLATES, "create"),
  controller.adminDuplicate
);

/**
 * @swagger
 * /admin/templates/{id}:
 *   delete:
 *     summary: Soft-delete a template
 *     tags: [AdminTemplates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Template deleted
 */
adminRouter.delete(
  "/:id",
  validateObjectId("id"),
  requirePageAccess(ADMIN_PAGES.TEMPLATES, "delete"),
  controller.adminDelete
);

// ── Categories ──────────────────────────────────────────────────────────────
const categoriesRouter = express.Router();

/**
 * @swagger
 * /template-categories:
 *   get:
 *     summary: List active template categories (public)
 *     tags: [TemplateCategories]
 *     responses:
 *       200:
 *         description: Category list
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TemplateCategoryListEnvelope' }
 */
categoriesRouter.get("/", controller.listCategories);

const adminCategoriesRouter = express.Router();
adminCategoriesRouter.use(protect);

/**
 * @swagger
 * /admin/template-categories:
 *   get:
 *     summary: List all template categories (admin, includes inactive)
 *     tags: [TemplateCategories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Category list
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TemplateCategoryListEnvelope' }
 */
adminCategoriesRouter.get(
  "/",
  requirePageAccess(ADMIN_PAGES.TEMPLATE_CATEGORIES, "view"),
  controller.adminListCategories
);

/**
 * @swagger
 * /admin/template-categories:
 *   post:
 *     summary: Create a template category
 *     tags: [TemplateCategories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TemplateCategoryCreateInput' }
 *     responses:
 *       201:
 *         description: Category created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TemplateCategoryEnvelope' }
 */
adminCategoriesRouter.post(
  "/",
  requirePageAccess(ADMIN_PAGES.TEMPLATE_CATEGORIES, "create"),
  validateZod(createCategorySchema),
  controller.adminCreateCategory
);

/**
 * @swagger
 * /admin/template-categories/{id}:
 *   put:
 *     summary: Update a template category
 *     tags: [TemplateCategories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TemplateCategoryUpdateInput' }
 *     responses:
 *       200:
 *         description: Category updated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TemplateCategoryEnvelope' }
 */
adminCategoriesRouter.put(
  "/:id",
  validateObjectId("id"),
  requirePageAccess(ADMIN_PAGES.TEMPLATE_CATEGORIES, "update"),
  validateZod(updateCategorySchema),
  controller.adminUpdateCategory
);

/**
 * @swagger
 * /admin/template-categories/{id}:
 *   delete:
 *     summary: Deactivate a template category (soft delete)
 *     tags: [TemplateCategories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdParam'
 *     responses:
 *       200:
 *         description: Category deactivated
 */
adminCategoriesRouter.delete(
  "/:id",
  validateObjectId("id"),
  requirePageAccess(ADMIN_PAGES.TEMPLATE_CATEGORIES, "delete"),
  controller.adminDeleteCategory
);

// ── Fonts ───────────────────────────────────────────────────────────────────
const fontsRouter = express.Router();

/**
 * @swagger
 * /fonts:
 *   get:
 *     summary: List supported fonts (public)
 *     tags: [Fonts]
 *     responses:
 *       200:
 *         description: Font registry
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/TemplateFontListEnvelope' }
 */
fontsRouter.get("/", controller.listFonts);

module.exports = hostRouter;
module.exports.adminRouter = adminRouter;
module.exports.categoriesRouter = categoriesRouter;
module.exports.adminCategoriesRouter = adminCategoriesRouter;
module.exports.fontsRouter = fontsRouter;
