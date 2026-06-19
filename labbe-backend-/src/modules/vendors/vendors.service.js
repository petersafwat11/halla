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
  _buildPublicVendorQuery(filters = {}) {
    const query = {
      role: "vendor",
      status: USER_STATUS.ACTIVE,
      "profile.vendorData.vendorStatus": VENDOR_STATUS.APPROVED,
    };
    if (filters.search) {
      const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    if (filters.category) {
      query[`profile.vendorData.serviceCategories.${filters.category}`] = { $exists: true, $ne: [] };
    }
    if (hasValue(filters.regionId)) query["profile.vendorData.serviceLocation.regionId"] = Number(filters.regionId);
    if (hasValue(filters.cityId)) query["profile.vendorData.serviceLocation.cityId"] = Number(filters.cityId);
    if (hasValue(filters.districtId)) {
      query["profile.vendorData.serviceLocation.districtIds"] = Number(filters.districtId);
    }
    if (hasValue(filters.rating)) query["profile.vendorData.rating"] = { $gte: Number(filters.rating) };
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
    const language = safeLanguage(options.language);
    const query = this._buildPublicVendorQuery(filters);

    if (hasValue(filters.minPrice) || hasValue(filters.maxPrice)) {
      const priceQuery = { status: SERVICE_STATUS.ACTIVE, isPublic: true, price: {} };
      if (hasValue(filters.minPrice)) priceQuery.price.$gte = Number(filters.minPrice);
      if (hasValue(filters.maxPrice)) priceQuery.price.$lte = Number(filters.maxPrice);
      const ids = await Service.distinct("vendorId", priceQuery);
      query._id = { $in: ids.length ? ids : [null] };
    }

    const candidateDocs = await User.find(query).select(PUBLIC_VENDOR_SELECT).lean();
    const summaries = await this._getServiceSummaries(candidateDocs.map((vendor) => vendor._id));
    const sort = filters.sort || "recommended";
    candidateDocs.sort((a, b) => {
      const av = a.profile?.vendorData || {};
      const bv = b.profile?.vendorData || {};
      const as = summaries.get(String(a._id));
      const bs = summaries.get(String(b._id));
      if (sort === "rating") return (bv.rating ?? -1) - (av.rating ?? -1) || String(a._id).localeCompare(String(b._id));
      if (sort === "price_asc") return (as?.minPrice ?? Infinity) - (bs?.minPrice ?? Infinity) || String(a._id).localeCompare(String(b._id));
      if (sort === "price_desc") return (bs?.minPrice ?? -1) - (as?.minPrice ?? -1) || String(a._id).localeCompare(String(b._id));
      if (sort === "newest") return new Date(b.createdAt) - new Date(a.createdAt) || String(a._id).localeCompare(String(b._id));
      return (bv.rating ?? -1) - (av.rating ?? -1)
        || (bs?.serviceCount || 0) - (as?.serviceCount || 0)
        || new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
        || String(a._id).localeCompare(String(b._id));
    });

    const total = candidateDocs.length;
    const vendors = candidateDocs.slice((page - 1) * limit, page * limit);
    const data = await Promise.all(vendors.map((vendor) =>
      this._formatVendorSummary(vendor, summaries.get(String(vendor._id)), language)));
    return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getPublicVendorById(vendorId, options = {}) {
    if (!mongoose.isValidObjectId(vendorId)) throw new NotFoundError("Vendor");
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
