/**
 * Vendors Module
 * Exports all vendors module components
 * @module modules/vendors
 */

const vendorsService = require('./vendors.service');
const vendorsController = require('./vendors.controller');
const vendorsRoutes = require('./vendors.routes');

module.exports = {
  vendorsService,
  vendorsController,
  vendorsRoutes,
};
