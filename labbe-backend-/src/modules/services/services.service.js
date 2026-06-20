/**
 * Services Service
 * Business logic for vendor services marketplace
 * @module modules/services/services.service
 */

const Service = require('../../../models/ServiceModel');
const User = require('../../../models/UserModel');
const mongoose = require('mongoose');
const { NotFoundError } = require('../../shared/errors');
const { SERVICE_STATUS, VENDOR_STATUS } = require('../../shared/constants');
const { extractStoredRef, signStoredImage } = require('../../shared/utils/s3Upload');
const logger = require('../../shared/utils/logger');
const { logAudit } = require('../../shared/utils/auditLog');
const locationsService = require('../locations/locations.service');

class ServicesService {
  /**
   * Get public services (marketplace)
   * The marketplace is a single global directory of approved vendors.
   */
  async getPublicServices(filters = {}, options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const approvedVendorIds = await User.distinct('_id', {
      role: 'vendor',
      'profile.vendorData.vendorStatus': VENDOR_STATUS.APPROVED,
    });

    let query = {
      status: SERVICE_STATUS.ACTIVE,
      isPublic: true,
      vendorId: { $in: approvedVendorIds },
    };

    if (filters.category) query.category = filters.category;
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
      data: await Promise.all(services.map((s) => this._formatService(s))),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get my services (vendor)
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
      data: await Promise.all(services.map((s) => this._formatService(s))),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get my stats (vendor)
   */
  async getMyStats(vendorId) {
    const objectId = new mongoose.Types.ObjectId(vendorId);
    const [total, active, agg] = await Promise.all([
      Service.countDocuments({ vendorId }),
      Service.countDocuments({ vendorId, status: 'active' }),
      Service.aggregate([
        { $match: { vendorId: objectId } },
        { $group: { _id: null, totalViews: { $sum: '$viewCount' }, avgRating: { $avg: '$rating' } } },
      ]),
    ]);

    const stats = agg[0] || {};
    return {
      stats: {
        totalServices: total,
        activeServices: active,
        totalViews: stats.totalViews || 0,
        avgRating: stats.avgRating || 0,
      },
    };
  }

  /**
   * Get service by ID
   * Vendors are scoped to their own services; non-vendors only see public+active
   * services and trigger a best-effort view counter increment.
   */
  async getServiceById(serviceId, vendorId = null, trackView = false) {
    const query = { _id: serviceId };
    if (vendorId) {
      query.vendorId = vendorId;
    } else {
      query.isPublic = true;
      query.status = SERVICE_STATUS.ACTIVE;
    }

    const service = await Service.findOne(query)
      .populate('vendorId', 'name avatar email mobile phoneNumber profile.vendorData.brandName profile.vendorData.businessLogo profile.vendorData.socialLinks profile.vendorData.serviceDescription profile.vendorData.rating profile.vendorData.numberOfRatings');

    if (!service) {
      throw new NotFoundError('Service');
    }

    if (trackView) {
      // Best-effort analytics counters — fire-and-forget, no transaction.
      Service.findByIdAndUpdate(serviceId, { $inc: { viewCount: 1 } }).exec();
      if (service.vendorId?._id) {
        User.findByIdAndUpdate(service.vendorId._id, {
          $inc: { 'profile.vendorData.numberOfClicks': 1 },
        }).exec();
      }
    }

    return { service: await this._formatService(service) };
  }

  /**
   * Create service
   */
  async createService(vendorId, data, file = null) {
    const serviceData = {
      ...data,
      vendorId,
      status: 'active',
      isPublic: true,
    };

    if (serviceData.serviceLocation) {
      serviceData.serviceLocation = await this._resolveLocationNames(serviceData.serviceLocation);
    }

    if (file) {
      // Persist the S3 key (or local dev path) so reads can sign fresh URLs.
      // Storing `file.location` (the full S3 URL) breaks once the bucket name
      // or region moves and forces brittle URL-parsing on every read.
      serviceData.image = extractStoredRef(file);
    }

    const service = await Service.create(serviceData);

    logAudit({
      action: 'service.created',
      actor: { _id: vendorId, role: 'vendor' },
      targetType: 'service',
      targetId: service._id,
      metadata: { name: service.name, category: service.category, price: service.price },
    }).catch(() => {});

    return { service: await this._formatService(service) };
  }

  /**
   * Update service
   */
  async updateService(serviceId, vendorId, data, file = null) {
    const service = await Service.findOne({ _id: serviceId, vendorId });

    if (!service) {
      throw new NotFoundError('Service');
    }

    if (data.serviceLocation) {
      data.serviceLocation = await this._resolveLocationNames(data.serviceLocation);
    }

    Object.assign(service, data);
    if (file) {
      service.image = extractStoredRef(file);
    }

    await service.save();

    logAudit({
      action: 'service.updated',
      actor: { _id: vendorId, role: 'vendor' },
      targetType: 'service',
      targetId: service._id,
      metadata: { changes: Object.keys(data), imageUpdated: !!file },
    }).catch(() => {});

    return { service: await this._formatService(service) };
  }

  /**
   * Toggle service status
   */
  async toggleServiceStatus(serviceId, vendorId) {
    const service = await Service.findOne({ _id: serviceId, vendorId });

    if (!service) {
      throw new NotFoundError('Service');
    }

    const previousStatus = service.status;
    const newStatus = service.status === SERVICE_STATUS.ACTIVE ? SERVICE_STATUS.DISABLED : SERVICE_STATUS.ACTIVE;
    service.status = newStatus;
    service.isPublic = newStatus === SERVICE_STATUS.ACTIVE;
    await service.save();

    logAudit({
      action: 'service.status_toggled',
      actor: { _id: vendorId, role: 'vendor' },
      targetType: 'service',
      targetId: service._id,
      metadata: { previousStatus, newStatus: service.status },
    }).catch(() => {});

    return { service: await this._formatService(service) };
  }

  /**
   * Delete service
   */
  async deleteService(serviceId, vendorId) {
    const service = await Service.findOneAndDelete({ _id: serviceId, vendorId });

    if (!service) {
      throw new NotFoundError('Service');
    }

    logAudit({
      action: 'service.deleted',
      actor: { _id: vendorId, role: 'vendor' },
      targetType: 'service',
      targetId: service._id,
      metadata: { name: service.name, category: service.category },
    }).catch(() => {});
  }

  /**
   * Format service for response
   * @private
   */
  async _formatService(service) {
    return {
      id: service._id,
      name: service.name,
      nameAr: service.nameAr,
      description: service.description,
      descriptionAr: service.descriptionAr,
      category: service.category,
      price: service.price,
      priceUnit: service.priceUnit || service.currency,
      image: await signStoredImage(service.image),
      tags: service.tags || [],
      duration: service.duration || null,
      included: service.included || [],
      status: service.status,
      isPublic: service.isPublic,
      rating: service.rating || 0,
      reviewsCount: service.reviewCount || 0,
      viewCount: service.viewCount || 0,
      serviceLocation: service.serviceLocation || null,
      vendor: service.vendorId
        ? {
            id: service.vendorId._id || service.vendorId,
            name: service.vendorId.name,
            brandName: service.vendorId.profile?.vendorData?.brandName,
            logo: await signStoredImage(service.vendorId.profile?.vendorData?.businessLogo),
            avatar: await signStoredImage(service.vendorId.avatar),
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
        const region = regions.find((r) => r.region_id === parseInt(resolved.regionId));
        if (region) {
          resolved.regionNameAr = region.name_ar;
          resolved.regionNameEn = region.name_en;
        }
      }

      if (resolved.cityId && !resolved.cityNameAr) {
        const { cities } = await locationsService.getCitiesByRegion(resolved.regionId);
        const city = cities.find((c) => c.city_id === parseInt(resolved.cityId));
        if (city) {
          resolved.cityNameAr = city.name_ar;
          resolved.cityNameEn = city.name_en;
        }
      }

      if (resolved.districtIds?.length && !resolved.districtNames?.length && resolved.cityId) {
        const { districts } = await locationsService.getDistrictsByCity(resolved.cityId);
        resolved.districtNames = resolved.districtIds
          .map((id) => districts.find((d) => d.district_id === parseInt(id)))
          .filter(Boolean)
          .map((d) => ({ nameAr: d.name_ar, nameEn: d.name_en }));
      }
    } catch (err) {
      logger.warn('Service location name resolution failed', { error: err.message });
    }

    return resolved;
  }

}

module.exports = new ServicesService();
