const router = require('express').Router();
const { protect } = require('../../shared/middleware/auth');
const { validateZod } = require('../../shared/middleware/validation');
const { createLimiter } = require('../../shared/middleware/rateLimiter');
const controller = require('./azureMaps.controller');
const validation = require('./azureMaps.validation');

// Separate budgets prevent map typing/tiles from exhausting unrelated API calls.
// Explicit prefixes keep these counters distinct when Redis is configured.
const searchLimit = createLimiter({ prefix: 'azure-search', windowMs: 60000, max: 60, skip: () => false });
const sessionLimit = createLimiter({ prefix: 'azure-session', windowMs: 60000, max: 10, skip: () => false });
const renderLimit = createLimiter({ prefix: 'azure-render', windowMs: 60000, max: 300,
  keyGenerator: req => `maps:${req.mapsUserId}`, skip: () => false });

router.post('/session', protect, sessionLimit, controller.createSession);
router.get('/render/:resource', controller.requireRenderSession, renderLimit, controller.render);
router.get('/autocomplete', protect, searchLimit, validateZod(validation.autocompleteQuery, 'query'), controller.autocomplete);
router.get('/reverse-geocode', protect, searchLimit, validateZod(validation.reverseQuery, 'query'), controller.reverseGeocode);

module.exports = router;
