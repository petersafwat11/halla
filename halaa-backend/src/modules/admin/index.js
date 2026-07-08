/**
 * Admin Module
 * @module modules/admin
 */

const adminRoutes = require('./admin.routes');
const adminService = require('./admin.service');
const adminController = require('./admin.controller');

module.exports = {
  routes: adminRoutes,
  service: adminService,
  controller: adminController,
};