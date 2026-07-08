/**
 * Auth Module Exports
 * @module modules/auth
 */

const authService = require('./auth.service');
const authController = require('./auth.controller');
const authRoutes = require('./auth.routes');
const authValidation = require('./auth.validation');

module.exports = {
  authService,
  authController,
  authRoutes,
  authValidation,
};
