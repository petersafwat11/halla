const catchAsync = require("../../shared/utils/catchAsync");
const service = require("./paymentLinks.service");
const { canManagePaymentLinks } = require("../../shared/constants");

const getConfig = catchAsync(async (req, res) => {
  const cfg = service.paymentLinksConfig();
  res.status(200).json({
    status: "success",
    data: {
      enabled: cfg.enabled,
      minAmountSar: cfg.minAmountSar,
      maxAmountSar: cfg.maxAmountSar,
      expiryChoicesDays: cfg.expiryChoicesDays,
      defaultExpiryDays: cfg.defaultExpiryDays,
      currency: "SAR",
      environment: service.getProviderEnvironment(),
      actorId: String(req.user._id),
      canCreate: cfg.enabled && canManagePaymentLinks(req.user),
      canRefresh: canManagePaymentLinks(req.user),
      canCancel: canManagePaymentLinks(req.user),
    },
  });
});

const create = catchAsync(async (req, res) => {
  const creationKey = req.get("Idempotency-Key") || req.get("idempotency-key");
  const { link, httpStatus } = await service.createPaymentLink({
    actor: req.user,
    body: req.body || {},
    creationKey,
  });
  res.status(httpStatus).json({
    status: httpStatus === 201 ? "success" : "pending",
    data: service.toDTO(link),
  });
});

const list = catchAsync(async (req, res) => {
  const result = await service.listPaymentLinks(req.query || {});
  res.status(200).json({ status: "success", data: result });
});

const getById = catchAsync(async (req, res) => {
  const data = await service.getPaymentLinkDetail(req.params.id);
  res.status(200).json({ status: "success", data });
});

const refresh = catchAsync(async (req, res) => {
  const { link, queued } = await service.refreshPaymentLink(req.params.id);
  res.status(queued ? 202 : 200).json({
    status: queued ? "pending" : "success",
    data: service.toDTO(link),
  });
});

const cancel = catchAsync(async (req, res) => {
  const link = await service.cancelPaymentLink({ linkId: req.params.id, actor: req.user });
  res.status(200).json({ status: "success", data: service.toDTO(link, { includeUrl: false }) });
});

/** Public provider callback — reconciliation hint only, no financial detail. */
const providerCallback = async (req, res) => {
  try {
    await service.handleProviderCallbackHint(req.body || {});
    return res.status(200).json({ status: "success", received: true });
  } catch (err) {
    return res.status(503).json({ status: "error", received: false });
  }
};

module.exports = { getConfig, create, list, getById, refresh, cancel, providerCallback };
