const z = require('zod');

const language = z.enum(['ar', 'en']).default('ar');
const latitude = z.coerce.number().min(-90).max(90);
const longitude = z.coerce.number().min(-180).max(180);
const zoom = z.coerce.number().int().min(0).max(19);

exports.autocompleteQuery = z.object({
  q: z.string().trim().min(3).max(160), language,
  latitude: latitude.optional(), longitude: longitude.optional(),
});
exports.reverseQuery = z.object({ latitude, longitude, language });
exports.tileQuery = z.object({
  zoom, language,
  x: z.coerce.number().int().nonnegative(),
  y: z.coerce.number().int().nonnegative(),
}).refine(query => query.x < 2 ** query.zoom && query.y < 2 ** query.zoom);
exports.attributionQuery = z.object({
  zoom,
  bounds: z.string().max(100)
    .refine(value => value.split(',').every(part => part.trim() !== ''))
    .transform(value => value.split(',').map(Number))
    .refine(bounds => bounds.length === 4 && bounds.every(Number.isFinite)
      && bounds[0] >= -180 && bounds[2] <= 180 && bounds[1] >= -90 && bounds[3] <= 90
      && bounds[0] < bounds[2] && bounds[1] < bounds[3]),
});
