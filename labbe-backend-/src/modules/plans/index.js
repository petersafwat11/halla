/**
 * Plans Module
 * Exports all plans module components
 * @module modules/plans
 */

const plansService = require('./plans.service');
const plansController = require('./plans.controller');
const plansRoutes = require('./plans.routes');

module.exports = {
  plansService,
  plansController,
  plansRoutes,
};
