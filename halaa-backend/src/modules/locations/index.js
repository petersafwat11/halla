/**
 * Locations Module
 * Exports all locations module components
 * @module modules/locations
 */

const locationsService = require('./locations.service');
const locationsController = require('./locations.controller');
const locationsRoutes = require('./locations.routes');

module.exports = {
  locationsService,
  locationsController,
  locationsRoutes,
};
