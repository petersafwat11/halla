/**
 * Services Service
 * Business logic for vendor services marketplace
 * @module modules/services/services.service
 */

const Service = require('../../../models/ServiceModel');
const User = require('../../../models/UserModel');
const mongoose = require('mongoose');
const { NotFoundError, ForbiddenError } = require('../../shared/errors');
const { SERVICE_STATUS, VENDOR_STATUS } = require('../../shared/constants');
const { getFileUrl } = require('../../shared/utils/s3Upload');
const locationsService = require('../locations/locations.service');

class ServicesService {
  /**
   * Get public services (marketplace)
   * @param {Object} filters
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async getPublicServices(filters = {}, options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    // FLOW-26-F02 + FLOW-24-F04: filter to approved vendors with completed profiles only
    const approvedVendorIds = await User.distinct('_id', {
      role: 'vendor',
      'profile.vendorData.vendorStatus': VENDOR_STATUS.APPROVED,
      'profile.vendorData.profileCompleted': true,
    });

    let query = {
      status: SERVICE_STATUS.ACTIVE,
      isPublic: true,
      vendorId: { $in: approvedVendorIds },
    };

    if (filters.category) query.type = filters.category;
    if (filters.vendorId) query.vendorId = filters.vendorId;
    if (filters.search) {
      const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
      ];
    }
    if (filters.regionId) query['serviceLocation.regionId'] = parseInt(filters.regionId);
    if (filters.cityId) query['serviceLocation.cityId'] = parseInt(filters.cityId);
    if (filters.districtIds) {
      const ids = filters.districtIds.split(',').map(Number).filter(Boolean);
      if (ids.length) query['serviceLocation.districtIds'] = { $in: ids };
    }
    if (filters.minPrice || filters.maxPrice) {
      query.price = {};
      if (filters.minPrice) query.price.$gte = parseFloat(filters.minPrice);
      if (filters.maxPrice) query.price.$lte = parseFloat(filters.maxPrice);
    }
    if (filters.minRating) query.rating = { $gte: parseFloat(filters.minRating) };

    // FLOW-26-F01: include vendor rating in marketplace populate
    const vendorPopulateFields = 'name avatar email mobile phoneNumber profile.vendorData.brandName profile.vendorData.businessLogo profile.vendorData.socialLinks profile.vendorData.serviceDescription profile.vendorData.rating profile.vendorData.numberOfRatings';

    const [services, total] = await Promise.all([
      Service.find(query)
        .populate('vendorId', vendorPopulateFields)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Service.countDocuments(query),
    ]);

    return {
      data: services.map((s) => this._formatService(s)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get my services (vendor)
   * @param {string} vendorId
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async getMyServices(vendorId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [services, total] = await Promise.all([
      Service.find({ vendorId })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Service.countDocuments({ vendorId }),
    ]);

    return {
      data: services.map((s) => this._formatService(s)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get my stats (vendor)
   * @param {string} vendorId
   * @returns {Promise<Object>}
   */
  async getMyStats(vendorId) {
    const objectId = new mongoose.Types.ObjectId(vendorId);
    const [total, active, agg] = await Promise.all([
      Service.countDocuments({ vendorId }),
      Service.countDocuments({ vendorId, status: 'active' }),
      Service.aggregate([
        { $match: { vendorId: objectId } },
        { $group: { _id: null, totalViews: { $sum: '$viewCount' }, totalBookings: { $sum: '$bookingCount' }, avgRating: { $avg: '$rating' } } },
      ]),
    ]);

    const stats = agg[0] || {};
    return {
      stats: {
        totalServices: total,
        activeServices: active,
        totalViews: stats.totalViews || 0,
        totalBookings: stats.totalBookings || 0,
        avgRating: stats.avgRating || 0,
      },
    };
  }

  /**
   * Get service by ID
   * @param {string} serviceId
   * @param {string} [vendorId]
   * @returns {Promise<Object>}
   */
  async getServiceById(serviceId, vendorId = null, trackView = false) {
    const query = { _id: serviceId };
    if (vendorId) query.vendorId = vendorId;

    const service = await Service.findOne(query)
      .populate('vendorId', 'name avatar email mobile phoneNumber profile.vendorData.brandName profile.vendorData.businessLogo profile.vendorData.socialLinks profile.vendorData.serviceDescription profile.vendorData.rating profile.vendorData.numberOfRatings');

    if (!service) {
      throw new NotFoundError('Service');
    }

    // FLOW-26-F05: increment numberOfClicks on public vendor profile view
    if (trackView) {
      Service.findByIdAndUpdate(serviceId, { $inc: { viewCount: 1 } }).exec();
      if (service.vendorId?._id) {
        User.findByIdAndUpdate(service.vendorId._id, {
          $inc: { 'profile.vendorData.numberOfClicks': 1 },
        }).exec();
      }
    }

    return { service: this._formatService(service) };
  }

  /**
   * Record an inquiry on a service (FLOW-25-F04)
   * Increments both the Service-level counter and the vendor User-level counter.
   */
  async recordInquiry(serviceId) {
    const service = await Service.findByIdAndUpdate(
      serviceId,
      { $inc: { inquiryCount: 1 } },
      { new: true, select: 'vendorId' }
    );
    if (service?.vendorId) {
      User.findByIdAndUpdate(
        service.vendorId,
        { $inc: { 'profile.vendorData.inquiryCount': 1 } }
      ).exec();
    }
  }

  /**
   * Record a booking on a service (FLOW-25-F04)
   * Increments both the Service-level counter and the vendor User-level counter.
   */
  async recordBooking(serviceId) {
    const service = await Service.findByIdAndUpdate(
      serviceId,
      { $inc: { bookingCount: 1 } },
      { new: true, select: 'vendorId' }
    );
    if (service?.vendorId) {
      User.findByIdAndUpdate(
        service.vendorId,
        { $inc: { 'profile.vendorData.bookingCount': 1 } }
      ).exec();
    }
  }

  /**
   * Create service
   * @param {string} vendorId
   * @param {Object} data
   * @param {Object} [file]
   * @returns {Promise<Object>}
   */
  async createService(vendorId, data, file = null) {
    // FLOW-25-F01: new services default to isPublic:false; vendor must publish explicitly.
    const serviceData = {
      ...data,
      vendorId,
      status: 'active',
      isPublic: false,
    };

    // Auto-resolve location names if only IDs were provided
    if (serviceData.serviceLocation) {
      serviceData.serviceLocation = await this._resolveLocationNames(serviceData.serviceLocation);
    }

    if (file) {
      serviceData.image = getFileUrl(file) || `/uploads/services/${file.filename}`;
    }

    const service = await Service.create(serviceData);
    return { service: this._formatService(service) };
  }

  /**
   * Update service
   * @param {string} serviceId
   * @param {string} vendorId
   * @param {Object} data
   * @param {Object} [file]
   * @returns {Promise<Object>}
   */
  async updateService(serviceId, vendorId, data, file = null) {
    const service = await Service.findOne({ _id: serviceId, vendorId });

    if (!service) {
      throw new NotFoundError('Service');
    }

    // Auto-resolve location names if only IDs were provided
    if (data.serviceLocation) {
      data.serviceLocation = await this._resolveLocationNames(data.serviceLocation);
    }

    Object.assign(service, data);
    if (file) {
      service.image = getFileUrl(file) || `/uploads/services/${file.filename}`;
    }

    await service.save();
    return { service: this._formatService(service) };
  }

  /**
   * Toggle service status
   * @param {string} serviceId
   * @param {string} vendorId
   * @returns {Promise<Object>}
   */
  async toggleServiceStatus(serviceId, vendorId) {
    const service = await Service.findOne({ _id: serviceId, vendorId });

    if (!service) {
      throw new NotFoundError('Service');
    }

    service.status = service.status === SERVICE_STATUS.ACTIVE ? SERVICE_STATUS.DISABLED : SERVICE_STATUS.ACTIVE;
    await service.save();

    return { service: this._formatService(service) };
  }

  /**
   * Delete service
   * @param {string} serviceId
   * @param {string} vendorId
   * @returns {Promise<void>}
   */
  async deleteService(serviceId, vendorId) {
    const service = await Service.findOneAndDelete({ _id: serviceId, vendorId });

    if (!service) {
      throw new NotFoundError('Service');
    }
  }

  /**
   * Format service for response
   * @private
   */
  _formatService(service) {
    return {
      id: service._id,
      name: service.name,
      nameAr: service.nameAr,
      description: service.description,
      descriptionAr: service.descriptionAr,
      category: service.type,
      price: service.price,
      priceUnit: service.priceUnit || service.currency,
      image: this._sanitizeImagePath(service.image),
      tags: service.tags || [],
      status: service.status,
      isPublic: service.isPublic,
      rating: service.rating || 0,
      reviewsCount: service.reviewCount || 0,
      viewCount: service.viewCount || 0,
      inquiryCount: service.inquiryCount || 0,
      serviceLocation: service.serviceLocation || null,
      vendor: service.vendorId
        ? {
            id: service.vendorId._id || service.vendorId,
            name: service.vendorId.name,
            brandName: service.vendorId.profile?.vendorData?.brandName,
            logo: service.vendorId.profile?.vendorData?.businessLogo || null,
            avatar: service.vendorId.avatar,
            email: service.vendorId.email || null,
            phone: service.vendorId.mobile || service.vendorId.phoneNumber || null,
            website: service.vendorId.profile?.vendorData?.socialLinks?.website || null,
            rating: service.vendorId.profile?.vendorData?.rating || null,
            numberOfRatings: service.vendorId.profile?.vendorData?.numberOfRatings || 0,
          }
        : null,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }

  /**
   * Auto-resolve location names from IDs using locations service
   * @private
   */
  async _resolveLocationNames(location) {
    if (!location) return location;
    const resolved = { ...location };

    try {
      if (resolved.regionId && !resolved.regionNameAr) {
        const { regions } = await locationsService.getRegions();
        const region = regions.find((r) => r.region_id === parseInt(resolved.regionId) || r.id === parseInt(resolved.regionId));
        if (region) {
          resolved.regionNameAr = region.name_ar;
          resolved.regionNameEn = region.name_en;
        }
      }

      if (resolved.cityId && !resolved.cityNameAr) {
        const { cities } = await locationsService.getCitiesByRegion(resolved.regionId);
        const city = cities.find((c) => c.city_id === parseInt(resolved.cityId) || c.id === parseInt(resolved.cityId));
        if (city) {
          resolved.cityNameAr = city.name_ar;
          resolved.cityNameEn = city.name_en;
        }
      }

      if (resolved.districtIds?.length && !resolved.districtNames?.length && resolved.cityId) {
        const { districts } = await locationsService.getDistrictsByCity(resolved.cityId);
        resolved.districtNames = resolved.districtIds
          .map((id) => districts.find((d) => d.district_id === parseInt(id) || d.id === parseInt(id)))
          .filter(Boolean)
          .map((d) => ({ nameAr: d.name_ar, nameEn: d.name_en }));
      }
    } catch (err) {
      // Non-critical: proceed without names if resolution fails
    }

    return resolved;
  }

  /**
   * Sanitize image path - extract relative path from absolute filesystem paths
   * @private
   */
  _sanitizeImagePath(imagePath) {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/uploads')) return imagePath;

    // Handle absolute filesystem paths (e.g. E:\...\public\uploads\services\file.jpg)
    const publicIndex = imagePath.indexOf('public');
    if (publicIndex !== -1) {
      return imagePath.substring(publicIndex + 6).replace(/\\/g, '/');
    }

    return null;
  }
}

module.exports = new ServicesService();
