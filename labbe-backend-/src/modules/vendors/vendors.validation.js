const { z } = require('zod');

const SERVICE_CATEGORIES = [
  'eventPlanning',
  'mediaProduction',
  'giftsAndGiveaways',
  'foodAndBeverages',
  'beautyAndFashion',
  'logisticsAndDelivery',
  'corporateServices',
  'supportServices',
  'technicalServices',
  'soundLightingEntertainment',
  'hallsAndVenues',
];

const districtIdsCsv = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== '' ? v : undefined));

const getPublicVendorsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().optional(),
    category: z.enum(SERVICE_CATEGORIES).optional(),
    regionId: z.coerce.number().int().optional(),
    cityId: z.coerce.number().int().optional(),
    districtIds: districtIdsCsv,
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
  })
  .partial();

module.exports = {
  getPublicVendorsQuerySchema,
};
