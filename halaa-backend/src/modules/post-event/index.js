/**
 * Post-Event Module Exports
 * @module modules/post-event
 */

const postEventService = require('./post-event.service');
const postEventController = require('./post-event.controller');
const postEventRoutes = require('./post-event.routes');

module.exports = {
  postEventService,
  postEventController,
  postEventRoutes,
};
