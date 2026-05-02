/**
 * Subscriptions Module Exports
 * @module modules/subscriptions
 */

const subscriptionsService = require('./subscriptions.service');
const subscriptionsController = require('./subscriptions.controller');
const subscriptionsRoutes = require('./subscriptions.routes');

module.exports = {
  subscriptionsService,
  subscriptionsController,
  subscriptionsRoutes,
};
