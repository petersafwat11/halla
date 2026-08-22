/**
 * Locations Controller
 * HTTP request handling for Saudi Arabia locations
 * @module modules/locations/locations.controller
 */

const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess } = require('../../shared/utils/responseHelper');
const locationsService = require('./locations.service');
const googleMapsService = require('./googleMaps.service');

exports.getRegions = catchAsync(async (req, res) => {
  const result = await locationsService.getRegions();
  sendSuccess(res, result);
});

exports.getCitiesByRegion = catchAsync(async (req, res) => {
  const result = await locationsService.getCitiesByRegion(req.params.regionId);
  sendSuccess(res, result);
});

exports.getDistrictsByCity = catchAsync(async (req, res) => {
  const result = await locationsService.getDistrictsByCity(req.params.cityId);
  sendSuccess(res, result);
});

exports.getAllLocations = catchAsync(async (req, res) => {
  const result = await locationsService.getAllLocations();
  sendSuccess(res, result);
});

exports.searchLocations = catchAsync(async (req, res) => {
  const result = await locationsService.searchLocations(req.query.q);
  sendSuccess(res, result);
});

exports.googleAutocomplete = catchAsync(async (req, res) => {
  sendSuccess(res, await googleMapsService.autocomplete(req.query));
});

exports.googlePlaceDetails = catchAsync(async (req, res) => {
  sendSuccess(
    res,
    await googleMapsService.placeDetails({ ...req.query, placeId: req.params.placeId })
  );
});

exports.googleReverseGeocode = catchAsync(async (req, res) => {
  sendSuccess(res, await googleMapsService.reverseGeocode(req.query));
});
