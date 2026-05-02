/**
 * Vendors Service
 * Business logic for public vendor marketplace
 * @module modules/vendors/vendors.service
 */

const User = require('../../../models/UserModel');
const { NotFoundError } = require('../../shared/errors');
const { ROLES, USER_STATUS, VENDOR_STATUS } = require('../../shared/constants');

class VendorsService {
  /**
   * Get approved vendors (public marketplace)
   * @param {Object} filters
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async getApprovedVendors(filters = {}, options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const andConditions = [];

    let query = {
      role: ROLES.VENDOR,
      status: USER_STATUS.ACTIVE,
      'profile.vendorData.vendorStatus': VENDOR_STATUS.APPROVED,
    };

    // Filter by service type
    if (filters.serviceType) {
      query[`profile.vendorData.serviceCategories.${filters.serviceType}`] = {
        $exists: true,
        $ne: [],
      };
    }

    // Filter by category
    if (filters.category) {
      andConditions.push({
        $or: [
          { 'profile.vendorData.serviceCategories.eventPlanning': filters.category },
          { 'profile.vendorData.serviceCategories.mediaProduction': filters.category },
          { 'profile.vendorData.serviceCategories.giftsAndGiveaways': filters.category },
          { 'profile.vendorData.serviceCategories.foodAndBeverages': filters.category },
          { 'profile.vendorData.serviceCategories.beautyAndFashion': filters.category },
          { 'profile.vendorData.serviceCategories.logisticsAndDelivery': filters.category },
          { 'profile.vendorData.serviceCategories.corporateServices': filters.category },
          { 'profile.vendorData.serviceCategories.supportServices': filters.category },
          { 'profile.vendorData.serviceCategories.technicalServices': filters.category },
          { 'profile.vendorData.serviceCategories.soundLightingEntertainment': filters.category },
          { 'profile.vendorData.serviceCategories.hallsAndVenues': filters.category },
        ],
      });
    }

    // Filter by rating
    if (filters.minRating || filters.maxRating) {
      query['profile.vendorData.rating'] = {};
      if (filters.minRating) query['profile.vendorData.rating'].$gte = parseFloat(filters.minRating);
      if (filters.maxRating) query['profile.vendorData.rating'].$lte = parseFloat(filters.maxRating);
    }

    // Filter by price
    if (filters.minPrice || filters.maxPrice) {
      query['profile.vendorData.basePrice'] = {};
      if (filters.minPrice) query['profile.vendorData.basePrice'].$gte = parseFloat(filters.minPrice);
      if (filters.maxPrice) query['profile.vendorData.basePrice'].$lte = parseFloat(filters.maxPrice);
    }

    // Filter by location
    if (filters.regionId) {
      query['profile.vendorData.serviceLocation.regionId'] = parseInt(filters.regionId);
    }
    if (filters.cityId) {
      query['profile.vendorData.serviceLocation.cityId'] = parseInt(filters.cityId);
    }

    // Search
    if (filters.search) {
      const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      andConditions.push({
        $or: [
          { 'profile.vendorData.brandName': { $regex: escaped, $options: 'i' } },
          { 'profile.vendorData.businessDescription': { $regex: escaped, $options: 'i' } },
        ],
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    // Sorting
    let sort = { createdAt: -1 };
    if (filters.sortBy === 'rating') sort = { 'profile.vendorData.rating': -1 };
    if (filters.sortBy === 'price_low') sort = { 'profile.vendorData.basePrice': 1 };
    if (filters.sortBy === 'price_high') sort = { 'profile.vendorData.basePrice': -1 };

    const [vendors, total] = await Promise.all([
      User.find(query)
        .select('profile.vendorData username name avatar createdAt')
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .lean(),
      User.countDocuments(query),
    ]);

    return {
      data: vendors.map((v) => this._formatVendor(v)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get vendor by ID (public profile)
   * @param {string} vendorId
   * @returns {Promise<Object>}
   */
  async getVendorById(vendorId) {
    const vendor = await User.findOne({
      _id: vendorId,
      role: ROLES.VENDOR,
      status: USER_STATUS.ACTIVE,
      'profile.vendorData.vendorStatus': VENDOR_STATUS.APPROVED,
    }).select('profile.vendorData username name avatar createdAt');

    if (!vendor) {
      throw new NotFoundError('Vendor');
    }

    return { vendor: this._formatVendor(vendor) };
  }

  /**
   * Get vendor categories
   * @returns {Promise<Object>}
   */
  async getCategories() {
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

  /**
   * Format vendor for public response
   * @private
   */
  _formatVendor(vendor) {
    const vendorData = vendor.profile?.vendorData || {};
    return {
      id: vendor._id,
      username: vendor.username,
      name: vendor.name,
      avatar: vendor.avatar,
      brandName: vendorData.brandName,
      brandNameAr: vendorData.brandNameAr,
      businessLogo: vendorData.businessLogo,
      businessDescription: vendorData.businessDescription,
      businessDescriptionAr: vendorData.businessDescriptionAr,
      serviceCategories: vendorData.serviceCategories,
      serviceLocation: vendorData.serviceLocation,
      rating: vendorData.rating || 0,
      reviewCount: vendorData.reviewCount || 0,
      basePrice: vendorData.basePrice,
      portfolioImages: vendorData.portfolioImages || [],
      pricePackages: vendorData.pricePackages || [],
      createdAt: vendor.createdAt,
    };
  }
}

module.exports = new VendorsService();
