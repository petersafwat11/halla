const {
  ADDON_TYPES,
  EXTRA_INVITES_TIERS,
  DESIGN_TEMPLATE_TIERS,
  BUSINESS_CUSTOMIZATION,
} = require('../../shared/constants/addons');
const { ValidationError } = require('../../shared/errors');

const DEFAULT_SCOPE_BY_TYPE = {
  [ADDON_TYPES.EXTRA_INVITES]: 'pool',
  [ADDON_TYPES.DESIGN_TEMPLATE]: 'org',
  [ADDON_TYPES.BUSINESS_CUSTOMIZATION]: 'org',
};

function computePrice(addonType, { quantity, templateType } = {}) {
  if (addonType === ADDON_TYPES.EXTRA_INVITES) {
    const tier = EXTRA_INVITES_TIERS.find((t) => t.quantity === quantity);
    if (!tier) throw new ValidationError('Invalid extra invites quantity');
    return tier.price;
  }
  if (addonType === ADDON_TYPES.DESIGN_TEMPLATE) {
    const tier = DESIGN_TEMPLATE_TIERS.find((t) => t.type === templateType);
    if (!tier) throw new ValidationError('Invalid template type');
    return tier.price;
  }
  if (addonType === ADDON_TYPES.BUSINESS_CUSTOMIZATION) {
    return BUSINESS_CUSTOMIZATION.price;
  }
  return 0;
}

function resolveScope(addonType, requestedScope, { eventId } = {}) {
  if (requestedScope) {
    if (!['event', 'pool', 'org'].includes(requestedScope)) {
      throw new ValidationError(`Invalid scope: ${requestedScope}`);
    }
    return requestedScope;
  }
  // If the caller supplied an eventId without an explicit scope, treat that as
  // event-scoped — otherwise the addon's quantity would land on a pool counter
  // that per-event plans never read, silently wasting the addon.
  if (eventId) return 'event';
  return DEFAULT_SCOPE_BY_TYPE[addonType] || 'org';
}

module.exports = {
  computePrice,
  resolveScope,
  DEFAULT_SCOPE_BY_TYPE,
};
