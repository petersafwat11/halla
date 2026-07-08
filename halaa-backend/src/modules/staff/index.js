/**
 * Staff Module Exports
 * @module modules/staff
 */

const staffService = require('./staff.service');
const staffController = require('./staff.controller');
const staffRoutes = require('./staff.routes');

module.exports = {
  staffService,
  staffController,
  staffRoutes,
};
