/**
 * Taqnyat Templates Controller — Phase 4c W0-MODEL
 *
 * Three surfaces:
 *   - Public host: GET /taqnyat-templates?category=… (active+APPROVED only).
 *   - Admin:       GET /admin/taqnyat-templates (full list).
 *   - Admin:       POST /admin/taqnyat-templates/sync (super-admin only).
 *   - Admin:       PATCH /admin/taqnyat-templates/:id (assign category + var mapping).
 *
 * @module modules/taqnyat-templates/taqnyat-templates.controller
 */

const catchAsync = require("../../shared/utils/catchAsync");
const { sendSuccess } = require("../../shared/utils/responseHelper");
const service = require("./taqnyat-templates.service");

exports.listForHost = catchAsync(async (req, res) => {
  const { category } = req.query;
  const templates = await service.listForHost({ category });
  sendSuccess(res, { templates });
});

exports.listForAdmin = catchAsync(async (req, res) => {
  const { search, includeInactive } = req.query;
  const templates = await service.listForAdmin({
    search,
    includeInactive: includeInactive !== "false",
  });
  sendSuccess(res, { templates });
});

exports.sync = catchAsync(async (req, res) => {
  const result = await service.syncFromTaqnyat({ actor: req.user });
  sendSuccess(res, result, `Synced ${result.count} templates`);
});

exports.assignMapping = catchAsync(async (req, res) => {
  const { id } = req.params;
  const updates = {
    category: req.body.category,
    varMapping: req.body.varMapping,
    active: req.body.active,
    sortOrder: req.body.sortOrder,
  };
  const doc = await service.assignMapping(id, updates, req.user);
  sendSuccess(res, { template: doc }, "Template updated");
});

exports.createUpstream = catchAsync(async (req, res) => {
  const doc = await service.createUpstreamTemplate(req.body, req.user);
  sendSuccess(res, { template: doc }, "Template submitted to Meta for approval");
});

exports.deleteUpstream = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await service.deleteUpstreamTemplate(id, req.user);
  sendSuccess(res, result, "Template deleted from Taqnyat");
});
