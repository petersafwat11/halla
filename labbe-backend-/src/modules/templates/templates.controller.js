/**
 * Templates Controller — Phase 4c W0-VISUAL-BACKEND
 *
 * Two surfaces:
 *   - Host-facing (`exports.list`): GET /api/v2/templates?category=…
 *   - Admin (`exports.adminList` etc.): full CRUD + upload-url + duplicate.
 *
 * Categories live in the same module for cohesion.
 *
 * @module modules/templates/templates.controller
 */

const catchAsync = require("../../shared/utils/catchAsync");
const { sendSuccess, sendCreated } = require("../../shared/utils/responseHelper");
const { FONTS } = require("../../shared/constants/fontRegistry");
const service = require("./templates.service");

// ── Host-facing ─────────────────────────────────────────────────────────────
exports.list = catchAsync(async (req, res) => {
  const { category } = req.query;
  const templates = await service.listForHost({ category });
  sendSuccess(res, { templates });
});

exports.getById = catchAsync(async (req, res) => {
  const tpl = await service.getById(req.params.id);
  sendSuccess(res, { template: tpl });
});

// ── Admin ───────────────────────────────────────────────────────────────────
exports.adminList = catchAsync(async (req, res) => {
  const { category, search, includeInactive, includeDeleted } = req.query;
  const templates = await service.listForAdmin({
    category,
    search,
    includeInactive: includeInactive !== "false",
    includeDeleted: includeDeleted === "true",
    isSuperAdmin: req.user?.role === "super_admin",
  });
  sendSuccess(res, { templates });
});

exports.adminGetUploadUrl = catchAsync(async (req, res) => {
  const { filename, contentType } = req.body;
  const templateId = req.query.templateId || "new";
  const result = await service.getUploadUrl({ filename, contentType, templateId });
  sendSuccess(res, result);
});

exports.adminUploadImage = catchAsync(async (req, res) => {
  if (!req.file) throw new (require("../../shared/errors").ValidationError)("image file is required");
  const templateId = req.query.templateId || "new";
  const result = await service.handleImageUpload({
    fileBuffer: req.file.buffer,
    filename: req.file.originalname,
    contentType: req.file.mimetype,
    templateId,
  });
  sendSuccess(res, result);
});

exports.adminCreate = catchAsync(async (req, res) => {
  const doc = await service.createTemplate(req.body, req.user);
  sendCreated(res, { template: doc }, "Template created");
});

exports.adminUpdate = catchAsync(async (req, res) => {
  const doc = await service.updateTemplate(req.params.id, req.body, req.user);
  sendSuccess(res, { template: doc }, "Template updated");
});

exports.adminDelete = catchAsync(async (req, res) => {
  await service.deleteTemplate(req.params.id, req.user);
  sendSuccess(res, null, "Template deleted");
});

exports.adminDuplicate = catchAsync(async (req, res) => {
  const doc = await service.duplicateTemplate(req.params.id, req.user);
  sendCreated(res, { template: doc }, "Template duplicated");
});

// ── Categories ──────────────────────────────────────────────────────────────
exports.listCategories = catchAsync(async (req, res) => {
  const categories = await service.listCategories({ includeInactive: false });
  sendSuccess(res, { categories });
});

exports.adminListCategories = catchAsync(async (req, res) => {
  const categories = await service.listCategories({ includeInactive: true });
  sendSuccess(res, { categories });
});

exports.adminCreateCategory = catchAsync(async (req, res) => {
  const doc = await service.createCategory(req.body, req.user);
  sendCreated(res, { category: doc }, "Category created");
});

exports.adminUpdateCategory = catchAsync(async (req, res) => {
  const doc = await service.updateCategory(req.params.id, req.body, req.user);
  sendSuccess(res, { category: doc }, "Category updated");
});

exports.adminDeleteCategory = catchAsync(async (req, res) => {
  await service.deleteCategory(req.params.id, req.user);
  sendSuccess(res, null, "Category deleted");
});

// ── Fonts ───────────────────────────────────────────────────────────────────
exports.listFonts = catchAsync(async (_req, res) => {
  sendSuccess(res, { fonts: FONTS });
});
