const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess } = require('../../shared/utils/responseHelper');
const search = require('./azureMaps.service');
const renderer = require('./azureRender.service');

exports.autocomplete = catchAsync(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  sendSuccess(res, await search.autocomplete(req.query));
});
exports.reverseGeocode = catchAsync(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  sendSuccess(res, await search.reverseGeocode(req.query));
});
exports.createSession = (req, res) => {
  res.set('Cache-Control', 'no-store');
  sendSuccess(res, renderer.createSession(req.user._id));
};
exports.requireRenderSession = (req, res, next) => {
  try {
    const authorization = req.get('authorization') || '';
    req.mapsUserId = renderer.verifySession(authorization.startsWith('Bearer ') ? authorization.slice(7) : '');
    next();
  } catch (error) { next(error); }
};
exports.render = catchAsync(async (req, res) => {
  const result = await renderer.render(req.params.resource, req.query);
  res.set('Cache-Control', 'private, max-age=300');
  res.type(result.type).send(result.body);
});
