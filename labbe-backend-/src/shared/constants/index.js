/**
 * Constants Index
 * Re-exports all constants from a single entry point
 * @module shared/constants
 */

const roles = require('./roles');
const status = require('./status');
const permissions = require('./permissions');
const plans = require('./plans');
const { PLAN_DEFAULTS } = require('./planDefaults');
const { ADDON_TYPES, EXTRA_INVITES_TIERS, EXTRA_REMINDERS_TIERS, DESIGN_TEMPLATE_TIERS, BUSINESS_CUSTOMIZATION } = require('./addons');
const {
  isPerEventPlan, isPoolPlan, isManagedPlan, getPlanFamily, getBillingType,
  PLAN_FAMILIES, BILLING_TYPES, COMPENSATION_PERCENTAGE,
} = require('./plans');

module.exports = {
  ...roles,
  ...status,
  ...permissions,
  ...plans,
  PLAN_DEFAULTS,
  ADDON_TYPES,
  EXTRA_INVITES_TIERS,
  EXTRA_REMINDERS_TIERS,
  DESIGN_TEMPLATE_TIERS,
  BUSINESS_CUSTOMIZATION,
  isPerEventPlan,
  isPoolPlan,
  isManagedPlan,
  getPlanFamily,
  getBillingType,
  PLAN_FAMILIES,
  BILLING_TYPES,
  COMPENSATION_PERCENTAGE,
};
