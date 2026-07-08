/**
 * Guests Module Exports
 * @module modules/guests
 */

const guestsService = require('./guests.service');
const guestsController = require('./guests.controller');
const guestsRoutes = require('./guests.routes');

module.exports = {
  guestsService,
  guestsController,
  guestsRoutes,
};
