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

module.exports = { regionIdParam, cityIdParam, searchQuery };
