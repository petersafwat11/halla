/**
 * Services Module
 * Exports all services module components
 * @module modules/services
 */

const servicesService = require('./services.service');
const servicesController = require('./services.controller');
const servicesRoutes = require('./services.routes');

module.exports = {
  servicesService,
  servicesController,
  servicesRoutes,
};
