/**
 * @halaa-checkin/api
 * Internal QR code image generator.
 * Produces functional black-on-white QR codes with a 4-module quiet zone,
 * error correction level M, and no decorative logo overlay.
 * Adheres to Technical Contract Section 7 and Product Section 7.
 */

import QRCode from 'qrcode';

const DEFAULT_OPTIONS = {
  errorCorrectionLevel: 'M',
  margin: 4, // 4-module quiet zone
  width: 400, // Provides crisp high-DPI print output >= 35mm
  color: {
    dark: '#000000', // functional black-on-white per product §7
    light: '#ffffff',
  },
};

/**
 * Generate a PNG Buffer for a QR payload.
 *
 * @param {string} payload - QR text payload (e.g. HGC1...)
 * @param {object} [options]
 * @returns {Promise<Buffer>}
 */
export async function generateQrBuffer(payload, options = {}) {
  return QRCode.toBuffer(payload, {
    ...DEFAULT_OPTIONS,
    ...options,
    type: 'png',
  });
}

/**
 * Generate a base64 Data URL for a QR payload.
 *
 * @param {string} payload - QR text payload (e.g. HGC1...)
 * @param {object} [options]
 * @returns {Promise<string>} data:image/png;base64,...
 */
export async function generateQrDataUrl(payload, options = {}) {
  return QRCode.toDataURL(payload, {
    ...DEFAULT_OPTIONS,
    ...options,
  });
}
