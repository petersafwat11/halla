/**
 * Business Public Routes (token-based hosted checkout).
 * Mounted at /business. No auth — the checkout token is the credential.
 * Rate-limited by IP to blunt token brute-forcing.
 */

const express = require('express');
const router = express.Router();
const controller = require('./business.public.controller');
const { apiLimiter } = require('../../shared/middleware/rateLimiter');

// View hosted summary (token NOT consumed here).
router.get('/checkout/:token', apiLimiter, controller.getCheckoutSummary);

// Submit/pay (token consumed on submit).
router.post('/checkout/:token/submit', apiLimiter, controller.submitCheckout);

module.exports = router;
