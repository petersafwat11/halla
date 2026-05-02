const addonsService = require('./addons.service');

const getAvailableAddons = async (req, res, next) => {
  try {
    const addons = addonsService.getAvailableAddons();
    res.json({ success: true, data: addons });
  } catch (err) { next(err); }
};

const purchaseAddon = async (req, res, next) => {
  try {
    const addon = await addonsService.purchaseAddon(req.user._id, req.body);
    res.status(201).json({ success: true, data: addon });
  } catch (err) { next(err); }
};

const getMyAddons = async (req, res, next) => {
  try {
    const addons = await addonsService.getMyAddons(req.user._id);
    res.json({ success: true, data: addons });
  } catch (err) { next(err); }
};

module.exports = { getAvailableAddons, purchaseAddon, getMyAddons };
