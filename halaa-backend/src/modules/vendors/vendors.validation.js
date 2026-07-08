const { z } = require('zod');
const { SERVICE_CATEGORIES } = require('../../shared/constants');

const getPublicVendorsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().optional(),
    category: z.enum(SERVICE_CATEGORIES).optional(),
    regionId: z.coerce.number().int().optional(),
    cityId: z.coerce.number().int().optional(),
    districtId: z.coerce.number().int().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    rating: z.coerce.number().min(0).max(5).optional(),
    lang: z.enum(['ar', 'en']).optional(),
  })
  .partial();

module.exports = {
  getPublicVendorsQuerySchema,
};
