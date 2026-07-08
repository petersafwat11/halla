/**
 * Users Module Exports
 * @module modules/users
 */

const usersService = require('./users.service');
const usersController = require('./users.controller');
const usersRoutes = require('./users.routes');

module.exports = {
  usersService,
  usersController,
  usersRoutes,
};
