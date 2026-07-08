/**
 * Notifications Module Exports
 * @module modules/notifications
 */

const notificationsService = require('./notifications.service');
const notificationsController = require('./notifications.controller');
const notificationsRoutes = require('./notifications.routes');

module.exports = {
  notificationsService,
  notificationsController,
  notificationsRoutes,
};
