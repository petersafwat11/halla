/**
 * Locations Service
 * Business logic for Saudi Arabia locations (regions, cities, districts)
 * @module modules/locations/locations.service
 */

const regions = require('../../shared/data/cities/regions.json');
const cities = require('../../shared/data/cities/cities.json');
const districts = require('../../shared/data/cities/districts.json');

const RESULT_CAP = 50;

class LocationsService {
  constructor() {
    this._allLocationsCache = null;
  }

  async getRegions() {
    return { regions };
  }

  async getCitiesByRegion(regionId) {
    const filteredCities = cities.filter(
      (city) => city.region_id === parseInt(regionId)
    );
    return { cities: filteredCities };
  }

  async getDistrictsByCity(cityId) {
    const filteredDistricts = districts.filter(
      (district) => district.city_id === parseInt(cityId)
    );
    return { districts: filteredDistricts };
  }

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

  async searchLocations(query) {
    const searchTerm = query.toLowerCase();
    const matchedRegions = regions
      .filter(
        (r) => r.name_en.toLowerCase().includes(searchTerm) || r.name_ar.toLowerCase().includes(searchTerm)
      )
      .slice(0, RESULT_CAP);
    const matchedCities = cities
      .filter(
        (c) => c.name_en.toLowerCase().includes(searchTerm) || c.name_ar.toLowerCase().includes(searchTerm)
      )
      .slice(0, RESULT_CAP);
    const matchedDistricts = districts
      .filter(
        (d) => d.name_en.toLowerCase().includes(searchTerm) || d.name_ar.toLowerCase().includes(searchTerm)
      )
      .slice(0, RESULT_CAP);
    return { regions: matchedRegions, cities: matchedCities, districts: matchedDistricts };
  }
}

module.exports = new LocationsService();
