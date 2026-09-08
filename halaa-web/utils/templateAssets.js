// Authenticated template assets belong to the app's API origin, even when
// public invitation artwork is served from a different media origin.
export function templateAssetUrl(value) {
  if (typeof value !== 'string') return value;
  const match = value.match(/(?:^|https?:\/\/[^/]+)\/api\/v2(\/templates\/[a-f\d]{24}\/asset(?:\?[^#]*)?)$/i);
  return match ? `${(process.env.NEXT_PUBLIC_API_URL || '/api/v2').replace(/\/$/, '')}${match[1]}` : value;
}

export function normalizeTemplateAssets(response) {
  const normalize = template => template ? {
    ...template,
    imageUrl: templateAssetUrl(template.imageUrl),
    thumbnailUrl: templateAssetUrl(template.thumbnailUrl),
  } : template;
  if (!response?.data) return response;
  return {...response, data: {...response.data,
    ...(response.data.templates ? {templates: response.data.templates.map(normalize)} : {}),
    ...(response.data.template ? {template: normalize(response.data.template)} : {}),
  }};
}
