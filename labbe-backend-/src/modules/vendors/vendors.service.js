/**
 * Vendors Service
 * Business logic for public vendor marketplace
 * @module modules/vendors/vendors.service
 */

const User = require('../../../models/UserModel');
const Service = require('../../../models/ServiceModel');
const { VENDOR_STATUS, SERVICE_STATUS } = require('../../shared/constants');
const { signStoredImage, signStoredImages } = require('../../shared/utils/s3Upload');

class VendorsService {
  /**
   * Get public vendors (marketplace)
   * Returns approved vendors with their active public services.
   */
  async getPublicVendors(filters = {}, options = {}) {
    const { page = 1, limit = 12 } = options;
    const skip = (page - 1) * limit;

    const query = {
      role: 'vendor',
      'profile.vendorData.vendorStatus': VENDOR_STATUS.APPROVED,
    };

    if (filters.search) {
      const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { 'profile.vendorData.brandName': { $regex: escaped, $options: 'i' } },
        { 'profile.vendorData.serviceDescription': { $regex: escaped, $options: 'i' } },
      ];
    }

    if (filters.category) {
      query[`profile.vendorData.serviceCategories.${filters.category}`] = { $exists: true, $ne: [] };
    }

    if (filters.regionId) {
      query['profile.vendorData.serviceLocation.regionId'] = parseInt(filters.regionId);
    }
    if (filters.cityId) {
      query['profile.vendorData.serviceLocation.cityId'] = parseInt(filters.cityId);
    }
    if (filters.districtIds) {
      const ids = filters.districtIds.split(',').map(Number).filter(Boolean);
      if (ids.length) {
        query['profile.vendorData.serviceLocation.districtIds'] = { $in: ids };
      }
    }
    if (filters.minRating) {
      query['profile.vendorData.rating'] = { $gte: parseFloat(filters.minRating) };
    }

    if (filters.minPrice || filters.maxPrice) {
      const priceQuery = { status: SERVICE_STATUS.ACTIVE, isPublic: true };
      priceQuery.price = {};
      if (filters.minPrice) priceQuery.price.$gte = parseFloat(filters.minPrice);
      if (filters.maxPrice) priceQuery.price.$lte = parseFloat(filters.maxPrice);
      const vendorIdsForPrice = await Service.distinct('vendorId', priceQuery);
      query._id = { $in: vendorIdsForPrice.length ? vendorIdsForPrice : [null] };
    }

    const [vendors, total] = await Promise.all([
      User.find(query)
        .select('-password -passwordResetToken')
        .skip(skip)
        .limit(limit)
        .sort({ 'profile.vendorData.numberOfClicks': -1, createdAt: -1 })
        .lean(),
      User.countDocuments(query),
    ]);

    const vendorIds = vendors.map((v) => v._id);
    const services = await Service.find({
      vendorId: { $in: vendorIds },
      status: SERVICE_STATUS.ACTIVE,
      isPublic: true,
    })
      .sort({ price: 1 })
      .lean();

    const servicesByVendor = {};
    for (const svc of services) {
      const vid = svc.vendorId.toString();
      if (!servicesByVendor[vid]) servicesByVendor[vid] = [];
      servicesByVendor[vid].push(svc);
    }

    const data = await Promise.all(
      vendors.map(async (vendor) => {
        const vd = vendor.profile?.vendorData || {};
        const vendorServices = servicesByVendor[vendor._id.toString()] || [];

        const minPrice = vendorServices.length
          ? Math.min(...vendorServices.map((s) => s.price).filter((p) => p != null))
          : null;

        const firstPortfolioImage = vd.portfolioImages?.length
          ? vd.portfolioImages[0]
          : null;
        const firstServiceImage = vendorServices.length
          ? vendorServices[0].image
          : null;
        const coverImage = firstPortfolioImage || firstServiceImage || null;

        const categories = [];
        if (vd.serviceCategories) {
          for (const key of Object.keys(vd.serviceCategories)) {
            if (vd.serviceCategories[key]?.length) {
              categories.push(key);
            }
          }
        }

        return {
          id: vendor._id,
          name: vendor.name,
          brandName: vd.brandName || vendor.name,
          description: vd.serviceDescription || '',
          avatar: await signStoredImage(vendor.avatar),
          logo: await signStoredImage(vd.businessLogo),
          coverImage: await signStoredImage(coverImage),
          portfolio: await signStoredImages(vd.portfolioImages || []),
          email: vendor.email || null,
          mobile: vendor.mobile || vendor.phoneNumber || null,
          rating: vd.rating || 0,
          numberOfRatings: vd.numberOfRatings || 0,
          serviceCategories: categories,
          serviceLocation: vd.serviceLocation || null,
          socialLinks: vd.socialLinks || {},
          minPrice,
          services: await Promise.all(
            vendorServices.map(async (svc) => ({
              id: svc._id,
              name: svc.name,
              description: svc.description,
              category: svc.category,
              price: svc.price,
              currency: svc.currency,
              image: await signStoredImage(svc.image),
              tags: svc.tags || [],
              duration: svc.duration || null,
              included: svc.included || [],
              rating: svc.rating || 0,
              reviewCount: svc.reviewCount || 0,
            }))
          ),
          createdAt: vendor.createdAt,
        };
      })
    );

    return {
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get vendor categories
   * @returns {Promise<Object>}
   */
  getCategories() {
    const categories = [
      { key: 'eventPlanning', nameEn: 'Event Planning', nameAr: 'تخطيط الفعاليات' },
      { key: 'mediaProduction', nameEn: 'Media Production', nameAr: 'الإنتاج الإعلامي' },
      { key: 'giftsAndGiveaways', nameEn: 'Gifts & Giveaways', nameAr: 'الهدايا والتوزيعات' },
      { key: 'foodAndBeverages', nameEn: 'Food & Beverages', nameAr: 'الأطعمة والمشروبات' },
      { key: 'beautyAndFashion', nameEn: 'Beauty & Fashion', nameAr: 'الجمال والأزياء' },
      { key: 'logisticsAndDelivery', nameEn: 'Logistics & Delivery', nameAr: 'اللوجستيات والتوصيل' },
      { key: 'corporateServices', nameEn: 'Corporate Services', nameAr: 'خدمات الشركات' },
      { key: 'supportServices', nameEn: 'Support Services', nameAr: 'خدمات الدعم' },
      { key: 'technicalServices', nameEn: 'Technical Services', nameAr: 'الخدمات التقنية' },
      { key: 'soundLightingEntertainment', nameEn: 'Sound, Lighting & Entertainment', nameAr: 'الصوت والإضاءة والترفيه' },
      { key: 'hallsAndVenues', nameEn: 'Halls & Venues', nameAr: 'القاعات والأماكن' },
    ];
    return { categories };
  }
}

module.exports = new VendorsService();
