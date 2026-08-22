/**
 * Public vendor marketplace business logic.
 * Public responses are assembled from explicit allowlists. User documents and
 * private vendor identity/verification fields must never cross this boundary.
 */

const mongoose = require("mongoose");
const User = require("../../../models/UserModel");
const Service = require("../../../models/ServiceModel");
const {
  USER_STATUS,
  VENDOR_STATUS,
  SERVICE_STATUS,
  SERVICE_CATEGORY_LABELS,
} = require("../../shared/constants");
const { NotFoundError } = require("../../shared/errors");
const { signStoredImage, signStoredImages } = require("../../shared/utils/s3Upload");
const { normalizePhoneNumber, validateAndFormatPhone } = require("../../shared/utils/phone");
const moderationService = require("../moderation/moderation.service");

const PUBLIC_VENDOR_SELECT = [
  "name",
  "email",
  "mobile",
  "phoneNumber",
  "createdAt",
  "updatedAt",
  "profile.vendorData.brandName",
  "profile.vendorData.serviceDescription",
  "profile.vendorData.taglineAr",
  "profile.vendorData.taglineEn",
  "profile.vendorData.aboutAr",
  "profile.vendorData.aboutEn",
  "profile.vendorData.serviceCategories",
  "profile.vendorData.serviceLocation",
  "profile.vendorData.portfolioImages",
  "profile.vendorData.businessLogo",
  "profile.vendorData.socialLinks",
  "profile.vendorData.rating",
  "profile.vendorData.numberOfClicks",
].join(" ");

const hasValue = (value) => value !== undefined && value !== null && value !== "";
const safeLanguage = (language) => (String(language || "ar").toLowerCase().startsWith("en") ? "en" : "ar");
const excerpt = (value, max = 180) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
};

const getCategories = (vendorData = {}) =>
  Object.entries(vendorData.serviceCategories || {})
    .filter(([, values]) => Array.isArray(values) && values.length > 0)
    .map(([key]) => key);

const localizeVendorCopy = (vd, language) => {
  const isEnglish = safeLanguage(language) === "en";
  const about = (isEnglish ? vd.aboutEn || vd.aboutAr : vd.aboutAr || vd.aboutEn)
    || vd.serviceDescription
    || "";
  const tagline = (isEnglish ? vd.taglineEn || vd.taglineAr : vd.taglineAr || vd.taglineEn)
    || excerpt(about, 160)
    || (isEnglish ? "Event service provider" : "مزود خدمات مناسبات");
  return { about, tagline };
};

const cleanExternalUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
};

const cleanSocialLinks = (links = {}) => ({
  website: cleanExternalUrl(links.website),
  instagram: cleanExternalUrl(links.instagram),
  facebook: cleanExternalUrl(links.facebook),
  tiktok: cleanExternalUrl(links.tiktok),
  twitter: cleanExternalUrl(links.twitter),
});

const publicPhone = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const checked = validateAndFormatPhone(value);
  return checked.isValid ? checked.formatted : normalizePhoneNumber(value) || null;
};

class VendorsService {
  _extractDistrictIds(filters = {}) {
    if (filters.districtIds) {
      if (Array.isArray(filters.districtIds)) {
        const ids = filters.districtIds.map(Number).filter((n) => Number.isInteger(n) && n > 0);
        if (ids.length) return ids;
      } else if (typeof filters.districtIds === "string") {
        const ids = filters.districtIds
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isInteger(n) && n > 0);
        if (ids.length) return ids;
      } else if (typeof filters.districtIds === "number" && Number.isInteger(filters.districtIds) && filters.districtIds > 0) {
        return [filters.districtIds];
      }
    }
    if (hasValue(filters.districtId)) {
      const id = Number(filters.districtId);
      if (Number.isInteger(id) && id > 0) return [id];
    }
    return null;
  }

  _buildPublicVendorQuery(filters = {}) {
    const query = {
      role: "vendor",
      status: USER_STATUS.ACTIVE,
      deletedAt: { $exists: false },
      "profile.vendorData.vendorStatus": VENDOR_STATUS.APPROVED,
    };
    if (filters.search) {
      const escaped = String(filters.search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (escaped) {
        query.$or = [
          { name: { $regex: escaped, $options: "i" } },
          { "profile.vendorData.brandName": { $regex: escaped, $options: "i" } },
          { "profile.vendorData.serviceDescription": { $regex: escaped, $options: "i" } },
          { "profile.vendorData.taglineAr": { $regex: escaped, $options: "i" } },
          { "profile.vendorData.taglineEn": { $regex: escaped, $options: "i" } },
          { "profile.vendorData.aboutAr": { $regex: escaped, $options: "i" } },
          { "profile.vendorData.aboutEn": { $regex: escaped, $options: "i" } },
        ];
      }
    }
    if (filters.category && filters.category !== "all") {
      query[`profile.vendorData.serviceCategories.${filters.category}`] = { $exists: true, $ne: [] };
    }
    if (hasValue(filters.regionId)) {
      query["profile.vendorData.serviceLocation.regionId"] = Number(filters.regionId);
    }
    if (hasValue(filters.cityId)) {
      query["profile.vendorData.serviceLocation.cityId"] = Number(filters.cityId);
    }
    const districtIds = this._extractDistrictIds(filters);
    if (districtIds && districtIds.length > 0) {
      query["profile.vendorData.serviceLocation.districtIds"] = { $in: districtIds };
    }
    const minRating = hasValue(filters.minRating)
      ? Number(filters.minRating)
      : (hasValue(filters.rating) ? Number(filters.rating) : null);
    if (minRating !== null && !Number.isNaN(minRating)) {
      query["profile.vendorData.rating"] = { $gte: minRating };
    }
    return query;
  }

  async _getServiceSummaries(vendorIds) {
    if (!vendorIds.length) return new Map();
    const rows = await Service.aggregate([
      { $match: { vendorId: { $in: vendorIds }, status: SERVICE_STATUS.ACTIVE, isPublic: true } },
      { $sort: { price: 1, createdAt: -1, _id: 1 } },
      { $group: {
        _id: "$vendorId",
        serviceCount: { $sum: 1 },
        minPrice: { $min: "$price" },
        currency: { $first: "$currency" },
        firstServiceImage: { $first: "$image" },
        updatedAt: { $max: "$updatedAt" },
      } },
    ]);
    return new Map(rows.map((row) => [String(row._id), row]));
  }

  async _formatVendorSummary(vendor, serviceSummary, language) {
    const vd = vendor.profile?.vendorData || {};
    const copy = localizeVendorCopy(vd, language);
    const imageRef = vd.portfolioImages?.[0] || serviceSummary?.firstServiceImage || vd.businessLogo || null;
    const presentationImage = await signStoredImage(imageRef);
    const startingPrice = Number.isFinite(serviceSummary?.minPrice)
      ? { amount: serviceSummary.minPrice, currency: serviceSummary.currency || "SAR" }
      : null;
    return {
      id: String(vendor._id),
      brandName: vd.brandName || vendor.name || "",
      tagline: copy.tagline,
      taglineAr: vd.taglineAr || null,
      taglineEn: vd.taglineEn || null,
      aboutExcerpt: excerpt(copy.about),
      presentationImage,
      heroImage: presentationImage,
      logo: await signStoredImage(vd.businessLogo),
      rating: Number.isFinite(vd.rating) ? vd.rating : null,
      badges: [],
      categories: getCategories(vd),
      primaryCategory: getCategories(vd)[0] || null,
      location: vd.serviceLocation || null,
      startingPrice,
      serviceCount: serviceSummary?.serviceCount || 0,
      // Compatibility aliases for clients being upgraded in the same release.
      shortDescription: excerpt(copy.about),
      coverImage: presentationImage,
      serviceCategories: getCategories(vd),
      serviceLocation: vd.serviceLocation || null,
      minPrice: startingPrice?.amount ?? null,
      currency: startingPrice?.currency ?? null,
    };
  }

  async getPublicVendors(filters = {}, options = {}) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 12));
    const skip = (page - 1) * limit;
    const language = safeLanguage(options.language);
    const query = this._buildPublicVendorQuery(filters);

    const blocked = await moderationService.getBlockedKeySet("user", options.viewerId);
    const blockedVendorIds = [...blocked]
      .filter((key) => key.startsWith("user:"))
      .map((key) => key.slice("user:".length));

    if (blockedVendorIds.length) {
      const blockedObjectIds = blockedVendorIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      if (blockedObjectIds.length) {
        query._id = { $nin: blockedObjectIds };
      }
    }

    if (hasValue(filters.minPrice) || hasValue(filters.maxPrice)) {
      const priceQuery = { status: SERVICE_STATUS.ACTIVE, isPublic: true, price: {} };
      if (hasValue(filters.minPrice)) priceQuery.price.$gte = Number(filters.minPrice);
      if (hasValue(filters.maxPrice)) priceQuery.price.$lte = Number(filters.maxPrice);
      const matchedVendorIds = await Service.distinct("vendorId", priceQuery);
      const validIds = matchedVendorIds.filter((id) => id != null);
      if (query._id?.$nin) {
        const ninSet = new Set(query._id.$nin.map((id) => String(id)));
        const filtered = validIds.filter((id) => !ninSet.has(String(id)));
        query._id = { $in: filtered };
      } else {
        query._id = { $in: validIds };
      }
    }

    let sortStage = {
      vendorRating: -1,
      vendorServiceCount: -1,
      effectiveDate: -1,
      _id: 1,
    };

    if (filters.sort === "rating") {
      sortStage = { vendorRating: -1, vendorServiceCount: -1, _id: 1 };
    } else if (filters.sort === "price_asc") {
      sortStage = { minPrice: 1, vendorRating: -1, _id: 1 };
    } else if (filters.sort === "price_desc") {
      sortStage = { minPrice: -1, vendorRating: -1, _id: 1 };
    } else if (filters.sort === "recent") {
      sortStage = { effectiveDate: -1, vendorRating: -1, _id: 1 };
    }

    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: "services",
          let: { vId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$vendorId", "$$vId"] },
                    { $eq: ["$status", SERVICE_STATUS.ACTIVE] },
                    { $eq: ["$isPublic", true] },
                  ],
                },
              },
            },
            { $sort: { price: 1, createdAt: -1, _id: 1 } },
            {
              $group: {
                _id: "$vendorId",
                serviceCount: { $sum: 1 },
                minPrice: { $min: "$price" },
                currency: { $first: "$currency" },
                firstServiceImage: { $first: "$image" },
                updatedAt: { $max: "$updatedAt" },
              },
            },
          ],
          as: "serviceSummaryArr",
        },
      },
      {
        $addFields: {
          serviceSummary: { $arrayElemAt: ["$serviceSummaryArr", 0] },
          vendorRating: { $ifNull: ["$profile.vendorData.rating", -1] },
          vendorServiceCount: { $ifNull: [{ $arrayElemAt: ["$serviceSummaryArr.serviceCount", 0] }, 0] },
          minPrice: { $ifNull: [{ $arrayElemAt: ["$serviceSummaryArr.minPrice", 0] }, 999999999] },
          effectiveDate: { $ifNull: ["$updatedAt", "$createdAt"] },
        },
      },
      { $sort: sortStage },
      {
        $facet: {
          rows: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
                mobile: 1,
                phoneNumber: 1,
                createdAt: 1,
                updatedAt: 1,
                profile: 1,
                serviceSummary: 1,
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [aggResult] = await User.aggregate(pipeline);
    const rows = aggResult?.rows || [];
    const total = aggResult?.totalCount?.[0]?.count || 0;

    const data = await Promise.all(
      rows.map((vendor) =>
        this._formatVendorSummary(vendor, vendor.serviceSummary, language)
      )
    );

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getPublicVendorById(vendorId, options = {}) {
    if (!mongoose.isValidObjectId(vendorId)) throw new NotFoundError("Vendor");
    const blocked = await moderationService.getBlockedKeySet("user", options.viewerId);
    if (blocked.has(`user:${vendorId}`)) throw new NotFoundError("Vendor");
    const vendor = await User.findOne({
      _id: vendorId,
      role: "vendor",
      status: USER_STATUS.ACTIVE,
      "profile.vendorData.vendorStatus": VENDOR_STATUS.APPROVED,
    }).select(PUBLIC_VENDOR_SELECT).lean();
    if (!vendor) throw new NotFoundError("Vendor");

    const services = await Service.find({
      vendorId: vendor._id,
      status: SERVICE_STATUS.ACTIVE,
      isPublic: true,
    }).sort({ createdAt: -1, _id: 1 }).lean();
    const vd = vendor.profile?.vendorData || {};
    const language = safeLanguage(options.language);
    const copy = localizeVendorCopy(vd, language);
    const summaryMap = await this._getServiceSummaries([vendor._id]);
    const summary = await this._formatVendorSummary(vendor, summaryMap.get(String(vendor._id)), language);
    const phone = publicPhone(vendor.mobile || vendor.phoneNumber);
    const whatsapp = publicPhone(vd.socialLinks?.whatsapp) || phone;
    const portfolio = await signStoredImages(vd.portfolioImages || []);
    const serviceImage = services.find((service) => service.image)?.image || null;
    const heroImage = await signStoredImage(vd.portfolioImages?.[0] || serviceImage || vd.businessLogo || null);

    return { vendor: {
      ...summary,
      tagline: copy.tagline,
      about: copy.about,
      aboutAr: vd.aboutAr || null,
      aboutEn: vd.aboutEn || null,
      legacyDescription: vd.serviceDescription || null,
      heroImage,
      coverImage: heroImage,
      portfolio,
      contact: { email: vendor.email || null, phone, whatsapp },
      socialLinks: cleanSocialLinks(vd.socialLinks || {}),
      services: await Promise.all(services.map(async (service) => ({
        id: String(service._id),
        name: service.name || "",
        nameAr: service.nameAr || null,
        description: service.description || "",
        descriptionAr: service.descriptionAr || null,
        category: service.category,
        price: Number.isFinite(service.price) ? service.price : null,
        currency: service.currency || "SAR",
        image: await signStoredImage(service.image),
        tags: service.tags || [],
        included: service.included || [],
        location: service.serviceLocation || null,
      }))),
    } };
  }

  getCategories() {
    return { categories: SERVICE_CATEGORY_LABELS };
  }
}

module.exports = new VendorsService();
module.exports._private = { excerpt, safeLanguage, localizeVendorCopy, publicPhone, cleanExternalUrl, PUBLIC_VENDOR_SELECT };
