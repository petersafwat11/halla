const paymentsService = require('./payments.service');
const webhookController = require('./webhook.controller');
const catchAsync = require('../../shared/utils/catchAsync');
const { ROLES } = require('../../shared/constants');

exports.webhook = webhookController.handle;

exports.getById = catchAsync(async (req, res) => {
  const payment = await paymentsService.getById(req.params.id);
  // Authorization: hosts may only see their own payments; admins see all.
  const userId = String(req.user._id);
  const isAdmin = [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.MODERATOR,
    ROLES.WHITELABEL_ADMIN,
    ROLES.WHITELABEL_MODERATOR,
  ].includes(req.user.role);
  if (!isAdmin && String(payment.userId?._id || payment.userId) !== userId) {
    return res.status(403).json({ status: 'error', message: 'forbidden' });
  }
  return res.status(200).json({ status: 'success', data: payment });
});

exports.poll3ds = catchAsync(async (req, res) => {
  let payment = await paymentsService.getById(req.params.id);
  // Same self-only guard as getById — never leak payment status by id-guess.
  const userId = String(req.user._id);
  const isAdmin = [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.MODERATOR,
    ROLES.WHITELABEL_ADMIN,
    ROLES.WHITELABEL_MODERATOR,
  ].includes(req.user.role);
  if (!isAdmin && String(payment.userId?._id || payment.userId) !== userId) {
    return res.status(403).json({ status: 'error', message: 'forbidden' });
  }
  if (payment.status === 'pending_3ds' || payment.status === 'pending') {
    payment = await paymentsService.reconcileWithProvider(payment._id);
    if (payment.status === 'paid') {
      const purpose = payment.metadata?.purpose;
      try {
        if (
          purpose === 'subscription' &&
          payment.metadata?.pendingSubscribeIntent &&
          !payment.subscriptionId
        ) {
          const subscriptionsService = require('../subscriptions/subscriptions.service');
          await subscriptionsService.finalizePending3ds(payment._id);
        } else if (
          purpose === 'addon' &&
          payment.metadata?.pendingAddonIntent &&
          !payment.addonId
        ) {
          const addonsService = require('../addons/addons.service');
          await addonsService.finalizePending3ds(payment._id);
        }
      } catch (_) { /* finalize errors emit their own pending_refund audit */ }
      payment = await paymentsService.getById(payment._id);
    }
  }
  return res.status(200).json({ status: 'success', data: payment });
});

// Admin actions ────────────────────────────────────────────────
exports.refund = catchAsync(async (req, res) => {
  const { amount, reason } = req.body || {};
  const payment = await paymentsService.issueRefund({
    paymentId: req.params.id,
    amount: typeof amount === 'number' ? amount : undefined,
    reason,
    actorUserId: req.user._id,
  });
  return res.status(200).json({ status: 'success', data: payment });
});

exports.capture = catchAsync(async (req, res) => {
  const { amount } = req.body || {};
  const payment = await paymentsService.capturePayment({
    paymentId: req.params.id,
    amount: typeof amount === 'number' ? amount : undefined,
    actorUserId: req.user._id,
  });
  return res.status(200).json({ status: 'success', data: payment });
});

exports.void = catchAsync(async (req, res) => {
  const payment = await paymentsService.voidPayment({
    paymentId: req.params.id,
    actorUserId: req.user._id,
  });
  return res.status(200).json({ status: 'success', data: payment });
});

// Stub-only: allow tests to flip a stub payment to `paid` without
// going through 3DS. Disabled when MOYASAR_API_KEY is set (production).
exports.stubComplete3ds = catchAsync(async (req, res) => {
  if (process.env.MOYASAR_API_KEY) return res.status(404).end();
  const stub = require('../../infrastructure/paymentProvider/stub');
  stub._setStubStatus(req.query.id, 'paid');
  res.send('Stub 3DS complete. You may close this window.');
});
