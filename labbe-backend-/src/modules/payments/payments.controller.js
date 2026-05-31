const paymentsService = require('./payments.service');
const webhookController = require('./webhook.controller');
const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess } = require('../../shared/utils/responseHelper');

exports.webhook = webhookController.handle;

// Public 3DS deep-link bounce for the mobile app. Moyasar requires an
// http(s) `callback_url` (it rejects custom schemes), and our web `/host/*`
// pages are auth-gated — so a mobile user finishing 3DS would land on the
// website login. The app instead hands Moyasar this endpoint; Moyasar
// appends `?id=&status=`, and we 302 to the `halla://` deep link, which the
// app's in-app auth-session browser intercepts to return the user in-app.
// Whitelisted to a fixed scheme/host so this can't be used as an open
// redirect. If the 302 doesn't auto-close the iOS session on-device, swap
// the redirect for an HTML page doing `window.location.replace(target)`.
exports.appReturn = (req, res) => {
  const params = new URLSearchParams();
  if (req.query.id) params.set('id', String(req.query.id));
  if (req.query.status) params.set('status', String(req.query.status));
  const qs = params.toString();
  const target = `halla://host/payments/return${qs ? `?${qs}` : ''}`;
  res.redirect(302, target);
};

exports.getById = catchAsync(async (req, res) => {
  const payment = await paymentsService.getById(req.params.id, req.user);
  sendSuccess(res, payment);
});

exports.poll3ds = catchAsync(async (req, res) => {
  let payment = await paymentsService.getById(req.params.id, req.user);
  if (payment.status === 'pending_3ds' || payment.status === 'pending') {
    payment = await paymentsService.reconcileWithProvider(payment._id);
    if (payment.status === 'paid') {
      await paymentsService.runFinalization(payment);
      payment = await paymentsService.getById(payment._id, req.user);
    }
  }
  sendSuccess(res, payment);
});

exports.refund = catchAsync(async (req, res) => {
  const { amount, reason } = req.body || {};
  const payment = await paymentsService.issueRefund({
    paymentId: req.params.id,
    amount,
    reason,
    actorUserId: req.user._id,
    actorRole: req.user.role,
  });
  sendSuccess(res, payment, 'Refund issued');
});

exports.capture = catchAsync(async (req, res) => {
  const { amount } = req.body || {};
  const payment = await paymentsService.capturePayment({
    paymentId: req.params.id,
    amount,
    actorUserId: req.user._id,
    actorRole: req.user.role,
  });
  sendSuccess(res, payment, 'Payment captured');
});

exports.void = catchAsync(async (req, res) => {
  const payment = await paymentsService.voidPayment({
    paymentId: req.params.id,
    actorUserId: req.user._id,
    actorRole: req.user.role,
  });
  sendSuccess(res, payment, 'Payment voided');
});

