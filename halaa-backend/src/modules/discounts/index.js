/**
 * Discounts Module
 * @module modules/discounts
 */

const discountsRoutes = require('./discounts.routes');
const discountsService = require('./discounts.service');
const discountsController = require('./discounts.controller');

module.exports = { discountsRoutes, discountsService, discountsController };
