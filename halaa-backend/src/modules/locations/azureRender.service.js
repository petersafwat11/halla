const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { tileQuery, attributionQuery } = require('./azureMaps.validation');
const config = require('../../config');
const { AppError } = require('../../shared/errors');

const signingKey = () => crypto.createHmac('sha256', config.jwt.secret).update('halaa-azure-render-v1').digest();
const unavailable = () => new AppError('Map display is temporarily unavailable.', 503, 'MAPS_UNAVAILABLE');
function createSession(userId) {
  if (!config.maps.azureApiKey) throw new AppError('Map is not configured.', 503, 'MAPS_NOT_CONFIGURED');
  return { token: jwt.sign({}, signingKey(), { subject: String(userId), audience: 'azure-render', expiresIn: '30m', algorithm: 'HS256' }), expiresIn: 1800 };
}
function verifySession(token) {
  try {
    if (typeof token !== 'string' || token.length > 2048) throw new Error('Invalid token');
    const payload = jwt.verify(token, signingKey(), { audience: 'azure-render', algorithms: ['HS256'] });
    if (typeof payload.sub !== 'string' || !payload.sub || !Number.isFinite(payload.exp)) throw new Error('Invalid claims');
    return payload.sub;
  } catch { throw new AppError('Map session expired.', 401, 'MAPS_SESSION_EXPIRED'); }
}
async function render(resource, query) {
  const schema = resource === 'tile' ? tileQuery : resource === 'attribution' ? attributionQuery : null;
  const parsed = schema?.safeParse(query);
  if (!parsed?.success) throw new AppError('Invalid map request.', 400, 'INVALID_MAP_REQUEST');
  if (!config.maps.azureApiKey) throw unavailable();
  const q = parsed.data;
  const parameters = { 'api-version': '2024-04-01', tilesetId: 'microsoft.base.road', zoom: String(q.zoom) };
  if (resource === 'tile') Object.assign(parameters, { x: String(q.x), y: String(q.y), tileSize: '256', language: q.language === 'ar' ? 'ar-SA' : 'en-US' });
  else parameters.bounds = q.bounds.join(',');
  let response;
  try {
    response = await fetch(`https://atlas.microsoft.com/map/${resource}?${new URLSearchParams(parameters)}`, {
      headers: { 'subscription-key': config.maps.azureApiKey }, signal: AbortSignal.timeout(10000), redirect: 'error',
    });
    if (!response.ok) throw unavailable();
    if (resource === 'attribution') {
      const body = await response.json();
      if (!Array.isArray(body?.copyrights) || !body.copyrights.length || body.copyrights.some(text => typeof text !== 'string')) throw unavailable();
      return { body: { copyrights: body.copyrights }, type: 'application/json' };
    }
    if (!response.headers.get('content-type')?.startsWith('image/png')) throw unavailable();
    return { body: Buffer.from(await response.arrayBuffer()), type: 'image/png' };
  } catch { throw unavailable(); }
}
module.exports = { createSession, verifySession, render };
