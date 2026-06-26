const paymentsService = require('./payments.service');
const webhookController = require('./webhook.controller');
const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess } = require('../../shared/utils/responseHelper');

exports.webhook = webhookController.handle;

// Public 3DS deep-link bounce for the mobile app. Moyasar requires an
// http(s) `callback_url` (it rejects custom schemes), and our web `/host/*`
// pages are auth-gated — so a mobile user finishing 3DS would land on the
// website login. The app instead hands Moyasar this endpoint; Moyasar
// appends `?id=&status=`, and we hop to the `halla://` deep link, which the
// app's in-app auth-session browser intercepts to return the user in-app.
// Whitelisted to a fixed scheme/host so this can't be used as an open redirect.
//
// We serve an HTML interstitial rather than a bare 302: Android Chrome Custom
// Tabs frequently refuse to launch a custom scheme from a server redirect
// without a user gesture, leaving the user stuck on Moyasar's "redirecting
// back to merchant…" screen. The page auto-attempts the scheme and always
// shows a tap-to-return button (the guaranteed user-gesture path).
exports.appReturn = (req, res) => {
  const params = new URLSearchParams();
  if (req.query.id) params.set('id', String(req.query.id));
  if (req.query.status) params.set('status', String(req.query.status));
  const qs = params.toString();
  const path = `host/payments/return${qs ? `?${qs}` : ''}`;
  const target = `halla://${path}`;
  // Android intent:// fallback — Custom Tabs honor it even when a bare
  // custom-scheme navigation is blocked.
  const intentUrl = `intent://${path}#Intent;scheme=halla;end`;

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  const targetAttr = escapeHtml(target);
  const targetJs = JSON.stringify(target);
  const intentJs = JSON.stringify(intentUrl);

  res
    .status(200)
    .set('Content-Type', 'text/html; charset=utf-8')
    .send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>العودة إلى التطبيق</title>
<style>
  html,body{height:100%;margin:0}
  body{display:flex;flex-direction:column;align-items:center;justify-content:center;
    font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#fcfaf8;color:#2c2c2c;padding:24px;text-align:center}
  .spinner{width:38px;height:38px;border:3px solid #e8d7c2;border-top-color:#c28e5c;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:20px}
  @keyframes spin{to{transform:rotate(360deg)}}
  p{margin:0 0 20px;font-size:16px;line-height:1.6}
  a.btn{display:inline-block;background:#c28e5c;color:#fff;text-decoration:none;
    padding:14px 28px;border-radius:12px;font-size:16px;font-weight:600}
</style>
</head>
<body>
  <div class="spinner"></div>
  <p>جارٍ إعادتك إلى التطبيق…<br/>Returning you to the app…</p>
  <a class="btn" id="returnBtn" href="${targetAttr}">العودة إلى التطبيق · Open app</a>
  <script>
    (function () {
      var target = ${targetJs};
      var intentUrl = ${intentJs};
      function go() {
        try { window.location.replace(target); } catch (e) {}
        // Android intent fallback shortly after, in case the scheme was blocked.
        setTimeout(function () {
          if (/android/i.test(navigator.userAgent)) {
            try { window.location.href = intentUrl; } catch (e) {}
          }
        }, 600);
      }
      go();
    })();
  </script>
</body>
</html>`);
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
  const { amount, reason, deductInvites } = req.body || {};
  const payment = await paymentsService.issueRefund({
    paymentId: req.params.id,
    amount,
    reason,
    deductInvites,
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

