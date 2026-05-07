/**
 * Admin Service — facade
 * Re-exports all admin area services for backward compatibility.
 * Each area is implemented in its own file.
 */
const shared     = require('./admin.shared.service');
const hosts      = require('./admin.hosts.service');
const vendors    = require('./admin.vendors.service');
const moderators = require('./admin.moderators.service');
const whitelabels = require('./admin.whitelabels.service');
const events     = require('./admin.events.service');
const payments   = require('./admin.payments.service');

module.exports = {
  ...shared,
  ...hosts,
  ...vendors,
  ...moderators,
  ...whitelabels,
  ...events,
  ...payments,
};
