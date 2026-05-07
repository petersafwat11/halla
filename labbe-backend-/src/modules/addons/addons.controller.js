const addonsService = require('./addons.service');
const catchAsync = require('../../shared/utils/catchAsync');
const {
  sendSuccess,
  sendCreated,
  getPaginationFromQuery,
} = require('../../shared/utils/responseHelper');

const getAvailableAddons = catchAsync(async (req, res) => {
  const addons = addonsService.getAvailableAddons();
  sendSuccess(res, addons);
});

const purchaseAddon = catchAsync(async (req, res) => {
  const idempotencyKey = req.get('idempotency-key') || undefined;
  const result = await addonsService.purchaseAddon(
    req.user._id,
    req.body,
    { idempotencyKey }
  );
  // 3DS branch: service returns { requiresAction, redirectUrl, paymentId } and
  // the addon row is created later by the webhook / finalizePending3ds flow.
  // Use 200 (not 201) so the client distinguishes "completed" from "redirect".
  if (result?.requiresAction) {
    return sendSuccess(res, result);
  }
  // audit middleware reads res.locals.addonAudit
  res.locals.addonAudit = { addonId: result._id, status: result.status };
  sendCreated(res, result);
});

const getMyAddons = catchAsync(async (req, res) => {
  const pagination = getPaginationFromQuery(req.query, 20);
  const result = await addonsService.getMyAddons(req.user._id, pagination);
  res.status(200).json({
    success: true,
    status: 'success',
    data: result.items,
    pagination: result.pagination,
  });
});

const adminActivateAddon = catchAsync(async (req, res) => {
  const { notes } = req.body || {};
  const addon = await addonsService.activateAddonAsAdmin(
    req.user._id,
    req.params.id,
    notes
  );
  // audit middleware reads res.locals.addonAudit
  res.locals.addonAudit = { addonId: addon._id, status: addon.status };
  sendSuccess(res, addon);
});

module.exports = {
  getAvailableAddons,
  purchaseAddon,
  getMyAddons,
  adminActivateAddon,
};
