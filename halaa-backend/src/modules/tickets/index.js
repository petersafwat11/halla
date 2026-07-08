/**
 * Tickets Module Exports
 * @module modules/tickets
 */

const ticketsService = require('./tickets.service');
const ticketsController = require('./tickets.controller');
const ticketsRoutes = require('./tickets.routes');

module.exports = {
  ticketsService,
  ticketsController,
  ticketsRoutes,
};
