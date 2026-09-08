#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(rootDir, '..');

const globalsCssPath = path.resolve(repoRoot, 'halaa-web/app/[lang]/globals.css');
const tokensWebJsPath = path.resolve(repoRoot, 'halaa-web/styles/tokens.web.js');
const logoSvgPath = path.resolve(repoRoot, 'halaa-web/public/svg/logo.svg');
const sidebarLogoSvgPath = path.resolve(repoRoot, 'halaa-web/public/svg/events/sidebar-logo.svg');
const sidebarMobileLogoSvgPath = path.resolve(repoRoot, 'halaa-web/public/svg/events/sidebar-mobile-logo.svg');

const fontBaseDir = path.resolve(repoRoot, 'node_modules/@expo-google-fonts/cairo');

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return sha256(buf);
}

function extractRootBlock(cssContent) {
  const match = cssContent.match(/:root\s*\{([\s\S]*?)\n\}/);
  if (!match) {
    throw new Error('Could not find :root block in globals.css');
  }
  return `:root {${match[1]}\n}\n`;
}

console.log('Synchronizing Halaa design tokens and presentation assets...');

// 1. Extract tokens from globals.css
if (!fs.existsSync(globalsCssPath)) {
  throw new Error(`globals.css not found at ${globalsCssPath}`);
}
const globalsCss = fs.readFileSync(globalsCssPath, 'utf8');
const rootTokens = extractRootBlock(globalsCss);

const designDir = path.resolve(rootDir, 'design');
const assetsDir = path.resolve(designDir, 'assets');
const logosDir = path.resolve(assetsDir, 'logos');
const fontsDir = path.resolve(assetsDir, 'fonts');
const webPublicFontsDir = path.resolve(rootDir, 'web/public/fonts');
const webPublicImagesDir = path.resolve(rootDir, 'web/public/images');

const webStylesDir = path.resolve(rootDir, 'web/styles');
fs.mkdirSync(designDir, { recursive: true });
fs.mkdirSync(logosDir, { recursive: true });
fs.mkdirSync(fontsDir, { recursive: true });
fs.mkdirSync(webStylesDir, { recursive: true });
fs.mkdirSync(webPublicFontsDir, { recursive: true });
fs.mkdirSync(webPublicImagesDir, { recursive: true });

// Write design/tokens.css
const tokensCssPath = path.resolve(designDir, 'tokens.css');
const webTokensCssPath = path.resolve(webStylesDir, 'tokens.css');
const tokensHeader = `/*
 * Halaa Design Tokens Snapshot
 * Source: halaa-web/app/[lang]/globals.css (lines 1–352)
 *
 * Grounded decisions:
 * - App background: --bg-artboard (#f9f4ef) takes precedence over JS token (#fcfaf8).
 * - Typography: Cairo applies to both Arabic and English locales to match the live app.
 * - Root font-size: 100% in halaa-checkin (tokens retain original px values).
 */

`;

fs.writeFileSync(tokensCssPath, tokensHeader + rootTokens, 'utf8');
fs.writeFileSync(webTokensCssPath, tokensHeader + rootTokens, 'utf8');
console.log(`- Generated ${tokensCssPath}`);
console.log(`- Generated ${webTokensCssPath}`);

// 2. Copy logos
const logoFiles = [
  { src: logoSvgPath, destName: 'logo.svg' },
  { src: sidebarLogoSvgPath, destName: 'sidebar-logo.svg' },
  { src: sidebarMobileLogoSvgPath, destName: 'sidebar-mobile-logo.svg' },
];

const logoSourcesMeta = {};
for (const item of logoFiles) {
  if (fs.existsSync(item.src)) {
    const content = fs.readFileSync(item.src);
    fs.writeFileSync(path.resolve(logosDir, item.destName), content);
    fs.writeFileSync(path.resolve(webPublicImagesDir, item.destName), content);
    const relSource = path.relative(repoRoot, item.src).replace(/\\/g, '/');
    logoSourcesMeta[item.destName] = {
      source: relSource,
      sha256: sha256(content),
    };
    console.log(`- Copied logo ${item.destName}`);
  } else {
    console.warn(`! Missing logo source: ${item.src}`);
  }
}

// 3. Copy fonts
const fontFiles = [
  { src: path.resolve(fontBaseDir, '400Regular/Cairo_400Regular.ttf'), destName: 'Cairo_400Regular.ttf' },
  { src: path.resolve(fontBaseDir, '500Medium/Cairo_500Medium.ttf'), destName: 'Cairo_500Medium.ttf' },
  { src: path.resolve(fontBaseDir, '600SemiBold/Cairo_600SemiBold.ttf'), destName: 'Cairo_600SemiBold.ttf' },
  { src: path.resolve(fontBaseDir, '700Bold/Cairo_700Bold.ttf'), destName: 'Cairo_700Bold.ttf' },
  { src: path.resolve(fontBaseDir, 'LICENSE_FONT'), destName: 'LICENSE_FONT' },
];

const fontSourcesMeta = {};
for (const item of fontFiles) {
  if (fs.existsSync(item.src)) {
    const content = fs.readFileSync(item.src);
    fs.writeFileSync(path.resolve(fontsDir, item.destName), content);
    fs.writeFileSync(path.resolve(webPublicFontsDir, item.destName), content);
    const relSource = path.relative(repoRoot, item.src).replace(/\\/g, '/');
    fontSourcesMeta[item.destName] = {
      source: relSource,
      sha256: sha256(content),
    };
    console.log(`- Copied font ${item.destName}`);
  } else {
    console.warn(`! Missing font source: ${item.src}`);
  }
}

// 4. Create SOURCES.json
const sourcesJsonPath = path.resolve(designDir, 'SOURCES.json');
const sourcesManifest = {
  version: '1.0.0',
  extractedAt: new Date().toISOString(),
  precedenceRules: {
    background: '--bg-artboard (#f9f4ef) from globals.css overrides tokens.web.js (#fcfaf8)',
    font: 'Cairo applied to both Arabic and English locales matching live body layout',
    rootFontSize: '100% root with px tokens instead of 62.5% rem scaling',
  },
  sources: {
    globalsCss: {
      path: path.relative(repoRoot, globalsCssPath).replace(/\\/g, '/'),
      sha256: sha256File(globalsCssPath),
      tokenBlockSha256: sha256(rootTokens),
    },
    tokensWebJs: {
      path: path.relative(repoRoot, tokensWebJsPath).replace(/\\/g, '/'),
      sha256: fs.existsSync(tokensWebJsPath) ? sha256File(tokensWebJsPath) : null,
    },
    logos: logoSourcesMeta,
    fonts: {
      license: 'SIL Open Font License 1.1',
      provenance: 'node_modules/@expo-google-fonts/cairo',
      files: fontSourcesMeta,
    },
  },
};

fs.writeFileSync(sourcesJsonPath, JSON.stringify(sourcesManifest, null, 2) + '\n', 'utf8');
console.log(`- Generated ${sourcesJsonPath}`);
console.log('Halaa design synchronization complete.');
