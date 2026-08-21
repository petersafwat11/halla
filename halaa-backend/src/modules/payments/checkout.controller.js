const checkoutService = require('./checkout.service');
const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess, sendCreated } = require('../../shared/utils/responseHelper');

/**
 * POST /payments/quote
 *
 * Authoritative checkout quote calculation (PLN-02).
 * Returns complete line-item breakdown, discount allocation, setup fee,
 * tax, currency, total in SAR major and Halalas integer minor units, and quote signature.
 */
exports.getQuote = catchAsync(async (req, res) => {
  const quote = await checkoutService.getQuote(req.user?._id, req.body);
  sendSuccess(res, quote, 'Checkout quote');
});

/**
 * POST /payments/checkout
 *
 * Bundled plan + addons + discount checkout. Charges the combined total as
 * one Moyasar transaction; on success activates the subscription and creates
 * each addon row. On 3DS, returns 200 with `data.requiresAction === true`
 * and the redirect URL — the bundle is finalized later by the webhook /
 * poll3ds dispatch on `purpose: 'checkout'`.
 */
exports.checkout = catchAsync(async (req, res) => {
  const idempotencyKey = req.get('idempotency-key') || undefined;
  const result = await checkoutService.checkout(req.user._id, req.body, { idempotencyKey });
  if (result?.requiresAction) {
    return sendSuccess(res, result);
  }
  sendCreated(res, result);
});
