const express = require("express");
const router = express.Router();
const controller = require("./paymentLinks.controller");
const rateLimit = require("express-rate-limit");

/**
 * @swagger
 * /payment-links/provider-callback:
 *   post:
 *     summary: Moyasar invoice notification hint (public)
 *     description: |
 *       Treats the payload only as a reconciliation hint. Validates the
 *       invoice id, finds the known link, and re-fetches authoritative state
 *       with the server secret key. Never marks paid from the unsigned body.
 *       No financial detail in the response.
 *     tags: [Webhooks]
 *     responses:
 *       200: { description: Hint accepted }
 */
router.post(
  "/provider-callback",
  rateLimit({ windowMs: 60000, max: 120, standardHeaders: true, legacyHeaders: false }),
  express.json({ limit: "100kb" }),
  controller.providerCallback
);

module.exports = router;
