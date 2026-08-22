const z = require('zod');

const regionIdParam = z.object({
  regionId: z.coerce.number().int().positive(),
});

const cityIdParam = z.object({
  cityId: z.coerce.number().int().positive(),
});

const searchQuery = z.object({
  q: z.string().trim().min(2).max(100),
});

const googleAutocompleteQuery = z.object({
  q: z.string().trim().min(3).max(160),
  language: z.enum(['ar', 'en']).default('ar'),
  sessionToken: z.string().trim().min(8).max(128).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

const googlePlaceParams = z.object({
  placeId: z.string().trim().min(3).max(300),
});

const googlePlaceQuery = z.object({
  language: z.enum(['ar', 'en']).default('ar'),
  sessionToken: z.string().trim().min(8).max(128).optional(),
});

const googleReverseQuery = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  language: z.enum(['ar', 'en']).default('ar'),
});

module.exports = {
  regionIdParam,
  cityIdParam,
  searchQuery,
  googleAutocompleteQuery,
  googlePlaceParams,
  googlePlaceQuery,
  googleReverseQuery,
};
