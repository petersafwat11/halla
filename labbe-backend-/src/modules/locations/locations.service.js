/**
 * Locations Service
 * Business logic for Saudi Arabia locations (regions, cities, districts)
 * @module modules/locations/locations.service
 */

const regions = require('../../shared/data/cities/regions.json');
const cities = require('../../shared/data/cities/cities.json');
const districts = require('../../shared/data/cities/districts.json');

class LocationsService {
  constructor() {
    this._allLocationsCache = null;
  }
  /**
   * Get all regions
   * @returns {Promise<Object>}
   */
  async getRegions() {
    return { regions };
  }

  /**
   * Get cities by region
   * @param {number} regionId
   * @returns {Promise<Object>}
   */
  async getCitiesByRegion(regionId) {
    const filteredCities = cities.filter(
      (city) => city.region_id === parseInt(regionId)
    );
    return { cities: filteredCities };
  }

  /**
   * Get districts by city
   * @param {number} cityId
   * @returns {Promise<Object>}
   */
  async getDistrictsByCity(cityId) {
    const filteredDistricts = districts.filter(
      (district) => district.city_id === parseInt(cityId)
    );
    return { districts: filteredDistricts };
  }

  /**
   * Get all locations (regions with nested cities and districts)
   * @returns {Promise<Object>}
   */
  async getAllLocations() {
    if (this._allLocationsCache) return { locations: this._allLocationsCache };

    this._allLocationsCache = regions.map((region) => ({
      ...region,
      cities: cities
        .filter((city) => city.region_id === region.region_id)
        .map((city) => ({
          ...city,
          districts: districts.filter((d) => d.city_id === city.city_id),
        })),
    }));
    return { locations: this._allLocationsCache };
  }

  /**
   * Search locations by name
   * @param {string} query
   * @returns {Promise<Object>}
   */
  async searchLocations(query) {
    const searchTerm = query.toLowerCase();

    const matchedRegions = regions.filter(
      (r) =>
        r.name_en.toLowerCase().includes(searchTerm) ||
        r.name_ar.includes(query)
    );

    const matchedCities = cities.filter(
      (c) =>
        c.name_en.toLowerCase().includes(searchTerm) ||
        c.name_ar.includes(query)
    );

    const matchedDistricts = districts.filter(
      (d) =>
        d.name_en.toLowerCase().includes(searchTerm) ||
        d.name_ar.includes(query)
    );

    return {
      regions: matchedRegions,
      cities: matchedCities,
      districts: matchedDistricts,
    };
  }

  /**
   * Resolve location names from IDs
   * @param {Object} locationIds
   * @returns {Promise<Object>}
   */
  async resolveLocationNames(locationIds) {
    const { regionId, cityId, districtId } = locationIds;

    const region = regionId
      ? regions.find((r) => r.region_id === parseInt(regionId))
      : null;
    const city = cityId
      ? cities.find((c) => c.city_id === parseInt(cityId))
      : null;
    const district = districtId
      ? districts.find((d) => d.district_id === parseInt(districtId))
      : null;

    return {
      region: region
        ? { id: region.region_id, nameEn: region.name_en, nameAr: region.name_ar }
        : null,
      city: city
        ? { id: city.city_id, nameEn: city.name_en, nameAr: city.name_ar }
        : null,
      district: district
        ? { id: district.district_id, nameEn: district.name_en, nameAr: district.name_ar }
        : null,
    };
  }
}

module.exports = new LocationsService();
