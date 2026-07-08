/**
 * Business Public Controller
 *
 * Token-based hosted checkout for mode-B plan assignments. PUBLIC (no auth) —
 * the unguessable 256-bit token IS the credential. No sensitive business data
 * is returned on the summary.
 */

const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess } = require('../../shared/utils/responseHelper');
const assignmentService = require('./business.assignment.service');

exports.getCheckoutSummary = catchAsync(async (req, res) => {
  const summary = await assignmentService.getPublicSummary(req.params.token);
  sendSuccess(res, summary, 'Checkout summary');
});

exports.submitCheckout = catchAsync(async (req, res) => {
  const { source, callbackUrl } = req.body || {};
  const result = await assignmentService.submitCheckout(req.params.token, { source, callbackUrl });
  sendSuccess(res, result, 'Checkout submitted');
});
