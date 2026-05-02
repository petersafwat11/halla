/**
 * Dashboard Module Exports
 * @module modules/dashboard
 */

const dashboardService = require('./dashboard.service');
const dashboardController = require('./dashboard.controller');
const dashboardRoutes = require('./dashboard.routes');

module.exports = {
  dashboardService,
  dashboardController,
  dashboardRoutes,
};
