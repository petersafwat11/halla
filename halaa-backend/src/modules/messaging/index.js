/**
 * Messaging Module
 * @module modules/messaging
 */

const messagingRoutes = require('./messaging.routes');
const messagingService = require('./messaging.service');
const messagingController = require('./messaging.controller');

module.exports = {
  routes: messagingRoutes,
  service: messagingService,
  controller: messagingController,
};
