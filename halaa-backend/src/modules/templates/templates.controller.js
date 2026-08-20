const catchAsync = require("../../shared/utils/catchAsync");
const {
  sendSuccess,
  sendCreated,
} = require("../../shared/utils/responseHelper");
const { ValidationError } = require("../../shared/errors");
const { FONTS } = require("../../shared/constants/fontRegistry");
const service = require("./templates.service");

// ── Host-facing ─────────────────────────────────────────────────────────────
exports.list = catchAsync(async (req, res) => {
  const templates = await service.listForHost({ category: req.query.category });
  sendSuccess(res, { templates });
});

exports.getById = catchAsync(async (req, res) => {
  const tpl = await service.getById(req.params.id);
  sendSuccess(res, { template: tpl });
});

exports.getAsset = catchAsync(async (req, res) => {
  const variant = req.query.variant === "original" ? "original" : "thumbnail";
  const asset = await service.getAsset(req.params.id, variant);
  res.set("Content-Type", asset.contentType);
  res.set("Cache-Control", "private, max-age=3600");
  if (asset.etag) res.set("ETag", asset.etag);
  res.status(200).send(asset.body);
});

// ── Admin ───────────────────────────────────────────────────────────────────
exports.adminList = catchAsync(async (req, res) => {
  const templates = await service.listForAdmin({
    query: req.query,
    actor: req.user,
  });
  sendSuccess(res, { templates });
});

exports.adminUploadImage = catchAsync(async (req, res) => {
  if (!req.file) throw new ValidationError("image file is required");
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
exports.listCategories = catchAsync(async (_req, res) => {
  const categories = await service.listCategories({
    includeInactive: false,
    forHost: true,
  });
  sendSuccess(res, { categories });
});

exports.adminListCategories = catchAsync(async (_req, res) => {
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
  sendSuccess(res, null, "Category disabled");
});

// ── Fonts ───────────────────────────────────────────────────────────────────
exports.listFonts = catchAsync(async (_req, res) => {
  sendSuccess(res, { fonts: FONTS });
});
