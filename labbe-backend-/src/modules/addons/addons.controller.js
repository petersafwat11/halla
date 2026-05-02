const addonsService = require('./addons.service');

const getAvailableAddons = async (req, res, next) => {
  try {
    const addons = addonsService.getAvailableAddons();
    res.json({ success: true, data: addons });
  } catch (err) { next(err); }
};

const purchaseAddon = async (req, res, next) => {
  try {
    const idempotencyKey = req.get('idempotency-key') || undefined;
    const addon = await addonsService.purchaseAddon(
      req.user._id,
      req.body,
      { idempotencyKey }
    );
    res.locals.addonAudit = { addonId: addon._id, status: addon.status };
    res.status(201).json({ success: true, data: addon });
  } catch (err) { next(err); }
};

const getMyAddons = async (req, res, next) => {
  try {
    const addons = await addonsService.getMyAddons(req.user._id);
    res.json({ success: true, data: addons });
  } catch (err) { next(err); }
};

/**
 * Admin-only: activate a `pending_provisioning` addon.
 * POST /addons/admin/:id/activate
 */
const adminActivateAddon = async (req, res, next) => {
  try {
    const { notes } = req.body || {};
    const addon = await addonsService.activateAddonAsAdmin(
      req.user._id,
      req.params.id,
      notes
    );
    res.locals.addonAudit = { addonId: addon._id, status: addon.status };
    res.json({ success: true, data: addon });
  } catch (err) { next(err); }
};

module.exports = {
  getAvailableAddons,
  purchaseAddon,
  getMyAddons,
  adminActivateAddon,
};
