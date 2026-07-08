/**
 * Events Module Exports
 * @module modules/events
 */

const eventsService = require('./events.service');
const eventsController = require('./events.controller');
const eventsRoutes = require('./events.routes');

module.exports = {
  eventsService,
  eventsController,
  eventsRoutes,
};
