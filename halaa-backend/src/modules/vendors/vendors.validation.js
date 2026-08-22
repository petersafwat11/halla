const { z } = require('zod');
const { SERVICE_CATEGORIES } = require('../../shared/constants');

const parseDistrictIds = (val) => {
  if (!val) return undefined;
  if (Array.isArray(val)) {
    const numbers = val.map(Number).filter((n) => Number.isInteger(n) && n > 0);
    return numbers.length > 0 ? numbers : undefined;
  }
  if (typeof val === 'string') {
    const numbers = val
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    return numbers.length > 0 ? numbers : undefined;
  }
  if (typeof val === 'number' && Number.isInteger(val) && val > 0) {
    return [val];
  }
  return undefined;
};

const marketplaceSortOptions = ['rating', 'price_asc', 'price_desc', 'recent', 'default'];

const getPublicVendorsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().optional(),
    category: z.enum(SERVICE_CATEGORIES).optional(),
    regionId: z.coerce.number().int().optional(),
    cityId: z.coerce.number().int().optional(),
    districtIds: z.any().transform(parseDistrictIds).optional(),
    districtId: z.coerce.number().int().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    sort: z.enum(marketplaceSortOptions).optional(),
    lang: z.enum(['ar', 'en']).optional(),
  })
  .partial();

const MARKETPLACE_EVENT_TYPES = Object.freeze([
  'service_view',
  'vendor_view',
  'contact_click',
]);

const MARKETPLACE_TARGET_TYPES = Object.freeze([
  'service',
  'vendor',
]);

const MARKETPLACE_CONTACT_METHODS = Object.freeze([
  'whatsapp',
  'phone',
  'email',
  'website',
  'social',
  'service_request',
]);

const marketplaceTrackSchema = z.object({
  eventType: z.enum(MARKETPLACE_EVENT_TYPES),
  targetType: z.enum(MARKETPLACE_TARGET_TYPES),
  targetId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId'),
  contactMethod: z.enum(MARKETPLACE_CONTACT_METHODS).optional(),
  metadata: z.record(z.any()).optional(),
});

module.exports = {
  getPublicVendorsQuerySchema,
  parseDistrictIds,
  marketplaceSortOptions,
  MARKETPLACE_EVENT_TYPES,
  MARKETPLACE_TARGET_TYPES,
  MARKETPLACE_CONTACT_METHODS,
  marketplaceTrackSchema,
};

