const Addon = require('../../../models/AddonModel');
const { ADDON_TYPES, EXTRA_INVITES_TIERS, EXTRA_REMINDERS_TIERS, DESIGN_TEMPLATE_TIERS, BUSINESS_CUSTOMIZATION } = require('../../shared/constants/addons');
const { ValidationError } = require('../../shared/errors');

class AddonsService {
  getAvailableAddons() {
    return {
      extra_invites: EXTRA_INVITES_TIERS,
      extra_reminders: EXTRA_REMINDERS_TIERS,
      design_template: DESIGN_TEMPLATE_TIERS,
      business_customization: BUSINESS_CUSTOMIZATION,
    };
  }

  async purchaseAddon(userId, data) {
    const { addonType, quantity, templateType, subscriptionId, eventId } = data;

    if (!Object.values(ADDON_TYPES).includes(addonType)) {
      throw new ValidationError(`Invalid addon type: ${addonType}`);
    }

    let price = 0;
    if (addonType === ADDON_TYPES.EXTRA_INVITES) {
      const tier = EXTRA_INVITES_TIERS.find(t => t.quantity === quantity);
      if (!tier) throw new ValidationError('Invalid extra invites quantity');
      price = tier.price;
    } else if (addonType === ADDON_TYPES.EXTRA_REMINDERS) {
      const tier = EXTRA_REMINDERS_TIERS.find(t => t.quantity === quantity);
      if (!tier) throw new ValidationError('Invalid extra reminders quantity');
      price = tier.price;
    } else if (addonType === ADDON_TYPES.DESIGN_TEMPLATE) {
      const tier = DESIGN_TEMPLATE_TIERS.find(t => t.type === templateType);
      if (!tier) throw new ValidationError('Invalid template type');
      price = tier.price;
    } else if (addonType === ADDON_TYPES.BUSINESS_CUSTOMIZATION) {
      price = BUSINESS_CUSTOMIZATION.price;
    }

    const addon = await Addon.create({
      userId, addonType, quantity: quantity || 1, templateType: templateType || null,
      price, subscriptionId: subscriptionId || null, eventId: eventId || null,
      status: 'pending',
    });

    return addon;
  }

  async getMyAddons(userId) {
    return Addon.find({ userId }).sort({ createdAt: -1 });
  }
}

module.exports = new AddonsService();
