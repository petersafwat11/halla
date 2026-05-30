const paymentsService = require('./payments.service');
const webhookController = require('./webhook.controller');
const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess } = require('../../shared/utils/responseHelper');

exports.webhook = webhookController.handle;

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

