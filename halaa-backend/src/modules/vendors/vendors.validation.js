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

module.exports = {
  getPublicVendorsQuerySchema,
  parseDistrictIds,
  marketplaceSortOptions,
};

