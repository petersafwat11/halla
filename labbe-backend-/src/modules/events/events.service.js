/**
 * Events Service
 * Business logic for event management - NO HTTP concerns
 *
 * This file is a thin façade that composes the seven sub-service modules
 * onto a single `EventsService` prototype via `Object.assign`. External
 * callers continue to do `eventsService.getEventById(...)` etc. — same
 * call shape, same `this.` semantics across helpers.
 *
 * @module modules/events/events.service
 */

class EventsService {}

Object.assign(
  EventsService.prototype,
  require('./events.crud.service'),
  require('./events.guests.service'),
  require('./events.staff.service'),
  require('./events.step2.service'),
  require('./events.settings.service'),
  require('./events.stats-export.service'),
  require('./events.launch.service'),
);

module.exports = new EventsService();
