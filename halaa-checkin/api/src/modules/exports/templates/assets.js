/**
 * @halaa-checkin/api
 * Template presentation assets loader.
 * Inlines local Cairo font binaries as base64 Data URLs and local logo SVG
 * to guarantee self-contained, zero-network, high-fidelity PDF rendering.
 * Adheres to Technical Contract Section 7.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveAssetPath(subpath) {
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, 'design', 'assets', subpath);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    dir = path.dirname(dir);
  }
  throw new Error(`Asset not found: design/assets/${subpath}`);
}

let cachedFontFacesCss = null;
let cachedLogoDataUrl = null;
let cachedLogoSvg = null;

/**
 * Return CSS @font-face rules with embedded Cairo font data URLs.
 *
 * @returns {string}
 */
export function getCairoFontFacesCss() {
  if (cachedFontFacesCss) return cachedFontFacesCss;

  const font400Path = resolveAssetPath('fonts/Cairo_400Regular.ttf');
  const font600Path = resolveAssetPath('fonts/Cairo_600SemiBold.ttf');
  const font700Path = resolveAssetPath('fonts/Cairo_700Bold.ttf');

  const b64_400 = fs.readFileSync(font400Path).toString('base64');
  const b64_600 = fs.readFileSync(font600Path).toString('base64');
  const b64_700 = fs.readFileSync(font700Path).toString('base64');

  cachedFontFacesCss = `
    @font-face {
      font-family: 'Cairo';
      font-weight: 400;
      font-style: normal;
      src: url('data:font/ttf;base64,${b64_400}') format('truetype');
    }
    @font-face {
      font-family: 'Cairo';
      font-weight: 600;
      font-style: normal;
      src: url('data:font/ttf;base64,${b64_600}') format('truetype');
    }
    @font-face {
      font-family: 'Cairo';
      font-weight: 700;
      font-style: normal;
      src: url('data:font/ttf;base64,${b64_700}') format('truetype');
    }
  `;

  return cachedFontFacesCss;
}

/**
 * Return the raw Halaa SVG logo string.
 *
 * @returns {string}
 */
export function getHalaaLogoSvg() {
  if (cachedLogoSvg) return cachedLogoSvg;
  const logoPath = resolveAssetPath('logos/logo.svg');
  cachedLogoSvg = fs.readFileSync(logoPath, 'utf8');
  return cachedLogoSvg;
}

/**
 * Return the Halaa logo as an image data URL.
 *
 * @returns {string}
 */
export function getHalaaLogoDataUrl() {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  const svg = getHalaaLogoSvg();
  const b64 = Buffer.from(svg).toString('base64');
  cachedLogoDataUrl = `data:image/svg+xml;base64,${b64}`;
  return cachedLogoDataUrl;
}
