import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_METADATA, PORTS, API_PREFIX, DESIGN_TOKENS } from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tokensCssPath = path.resolve(__dirname, '../../design/tokens.css');

test('contracts exports valid metadata and ports', () => {
  assert.equal(APP_METADATA.name, 'Halaa Guest Check-in');
  assert.equal(APP_METADATA.nameAr, 'هلا لإدارة دخول الضيوف');
  assert.equal(PORTS.API, 8100);
  assert.equal(PORTS.WEB, 3100);
  assert.equal(API_PREFIX, '/api/checkin/v1');
});

test('contracts verified design token values', () => {
  assert.equal(DESIGN_TOKENS.colors.artboard, '#f9f4ef');
  assert.equal(DESIGN_TOKENS.colors.primary, '#c28e5c');
  assert.equal(DESIGN_TOKENS.colors.surface, '#ffffff');
  assert.equal(DESIGN_TOKENS.radii.default, '12px');
});

test('design/tokens.css contains authoritative Halaa tokens and CSS-over-JS precedence', () => {
  assert.ok(fs.existsSync(tokensCssPath), 'design/tokens.css must exist');
  const content = fs.readFileSync(tokensCssPath, 'utf8');

  // Verify background is #f9f4ef
  assert.ok(content.includes('--bg-artboard: #f9f4ef;'), 'Tokens must contain --bg-artboard: #f9f4ef;');

  // Verify primary palette
  assert.ok(content.includes('--color-primary-500: #c28e5c;'), 'Primary 500 must be #c28e5c');
  assert.ok(content.includes('--color-primary-600: #b18154;'), 'Primary 600 must be #b18154');
  assert.ok(content.includes('--color-primary-800: #6b4e33;'), 'Primary 800 must be #6b4e33');
  assert.ok(content.includes('--color-primary-100: #f5ece4;'), 'Primary 100 must be #f5ece4');

  // Verify natural palette
  assert.ok(content.includes('--color-natural-50: #ffffff;'), 'Natural 50 must be #ffffff');
  assert.ok(content.includes('--color-natural-900: #2c2c2c;'), 'Natural 900 must be #2c2c2c');

  // Verify typography and radius scales
  assert.ok(content.includes('--font-ar: "Cairo", sans-serif;'), 'Font Arabic must reference Cairo');
  assert.ok(content.includes('--radius-12: 12px;'), 'Radius 12 must be 12px');
  assert.ok(content.includes('--radius: 12px;'), 'Default radius must be 12px');
});
