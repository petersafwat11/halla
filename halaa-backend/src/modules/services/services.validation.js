const { z } = require('zod');
const { SERVICE_CATEGORIES } = require('../../shared/constants');

const tagsSchema = z.preprocess(
  (v) => (Array.isArray(v) ? v.map(String) : []),
  z.array(z.string().trim().min(1))
);

const includedSchema = z.preprocess(
  (v) => (Array.isArray(v) ? v.map(String) : []),
  z.array(z.string().trim().min(1))
);

const serviceLocationSchema = z
  .object({
    regionId: z.coerce.number().int().nullable().optional(),
    regionNameAr: z.string().nullable().optional(),
    regionNameEn: z.string().nullable().optional(),
    cityId: z.coerce.number().int().nullable().optional(),
    cityNameAr: z.string().nullable().optional(),
    cityNameEn: z.string().nullable().optional(),
    districtIds: z.array(z.coerce.number().int()).optional(),
    districtNames: z
      .array(z.object({ nameAr: z.string().optional(), nameEn: z.string().optional() }))
      .optional(),
    coverageType: z.enum(['region', 'city', 'districts']).optional(),
  })
  .partial()
  .optional();

const createServiceSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  nameAr: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  descriptionAr: z.string().trim().max(2000).optional(),
  category: z.enum(SERVICE_CATEGORIES, { errorMap: () => ({ message: 'Invalid category' }) }),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  currency: z.string().trim().optional(),
  duration: z.string().trim().max(100).optional(),
  included: includedSchema.optional(),
  tags: tagsSchema.optional(),
  serviceLocation: serviceLocationSchema,
});

const updateServiceSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    nameAr: z.string().trim().max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    descriptionAr: z.string().trim().max(2000).optional(),
    category: z.enum(SERVICE_CATEGORIES).optional(),
    price: z.coerce.number().min(0).optional(),
    currency: z.string().trim().optional(),
    duration: z.string().trim().max(100).optional(),
    included: includedSchema.optional(),
    tags: tagsSchema.optional(),
    serviceLocation: serviceLocationSchema,
  })
  .partial();

const districtIdsCsv = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== '' ? v : undefined));

const getPublicServicesQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().optional(),
    category: z.enum(SERVICE_CATEGORIES).optional(),
    vendorId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    regionId: z.coerce.number().int().optional(),
    cityId: z.coerce.number().int().optional(),
    districtIds: districtIdsCsv,
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
  })
  .partial();

module.exports = {
  SERVICE_CATEGORIES,
  createServiceSchema,
  updateServiceSchema,
  getPublicServicesQuerySchema,
};
