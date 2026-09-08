#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(rootDir, '..');
const globalsCssPath = path.resolve(repoRoot, 'halaa-web/app/[lang]/globals.css');
const designDir = path.resolve(rootDir, 'design');
const tokensCssPath = path.resolve(designDir, 'tokens.css');
const sourcesJsonPath = path.resolve(designDir, 'SOURCES.json');

let hasError = false;

function check(desc, fn) {
  try {
    fn();
    console.log(`✓ ${desc}`);
  } catch (err) {
    console.error(`✗ ${desc}: ${err.message}`);
    hasError = true;
  }
}

console.log('Checking Halaa design tokens and presentation snapshot...');

// Check tokens.css exists
check('design/tokens.css exists', () => {
  if (!fs.existsSync(tokensCssPath)) throw new Error('File missing');
});

// Check SOURCES.json exists
check('design/SOURCES.json exists', () => {
  if (!fs.existsSync(sourcesJsonPath)) throw new Error('File missing');
});

if (fs.existsSync(tokensCssPath)) {
  const tokensContent = fs.readFileSync(tokensCssPath, 'utf8');

  // Verify critical token values
  check('Token --bg-artboard is #f9f4ef', () => {
    if (!tokensContent.includes('--bg-artboard: #f9f4ef;')) {
      throw new Error('Expected --bg-artboard: #f9f4ef;');
    }
  });

  check('Token --color-primary-500 is #c28e5c', () => {
    if (!tokensContent.includes('--color-primary-500: #c28e5c;')) {
      throw new Error('Expected --color-primary-500: #c28e5c;');
    }
  });

  check('Token --font-ar includes Cairo', () => {
    if (!tokensContent.includes('--font-ar: "Cairo", sans-serif;')) {
      throw new Error('Expected --font-ar to reference Cairo');
    }
  });

  check('Token --radius-12 is 12px', () => {
    if (!tokensContent.includes('--radius-12: 12px;')) {
      throw new Error('Expected --radius-12: 12px;');
    }
  });

  // Verify root block parity if parent globals.css exists
  if (fs.existsSync(globalsCssPath)) {
    check('tokens.css matches parent globals.css :root block', () => {
      const globalsCss = fs.readFileSync(globalsCssPath, 'utf8');
      const match = globalsCss.match(/:root\s*\{([\s\S]*?)\n\}/);
      if (!match) throw new Error('Cannot find :root block in globals.css');
      const sourceRootBlock = `:root {${match[1]}\n}\n`;
      if (!tokensContent.includes(sourceRootBlock.trim())) {
        throw new Error('design/tokens.css does not match globals.css :root block');
      }
    });
  }
}

// Verify font assets
const fontNames = [
  'Cairo_400Regular.ttf',
  'Cairo_500Medium.ttf',
  'Cairo_600SemiBold.ttf',
  'Cairo_700Bold.ttf',
  'LICENSE_FONT',
];

for (const fontName of fontNames) {
  check(`Font asset design/assets/fonts/${fontName} exists`, () => {
    const p = path.resolve(designDir, 'assets/fonts', fontName);
    if (!fs.existsSync(p)) throw new Error(`Missing ${fontName}`);
    if (fs.statSync(p).size === 0) throw new Error(`Empty file ${fontName}`);
  });
}

// Verify logo assets
const logoNames = ['logo.svg', 'sidebar-logo.svg', 'sidebar-mobile-logo.svg'];
for (const logoName of logoNames) {
  check(`Logo asset design/assets/logos/${logoName} exists`, () => {
    const p = path.resolve(designDir, 'assets/logos', logoName);
    if (!fs.existsSync(p)) throw new Error(`Missing ${logoName}`);
  });
}

if (hasError) {
  console.error('\nDesign check FAILED.');
  process.exit(1);
} else {
  console.log('\nAll design checks PASSED.');
  process.exit(0);
}
