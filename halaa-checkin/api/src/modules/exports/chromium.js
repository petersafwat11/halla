/**
 * @halaa-checkin/api
 * Cross-platform Chromium executable locator.
 * Detects local system Edge/Chrome on Windows, Chromium in Docker/Linux,
 * or user-configured paths via environment variables.
 */

import fs from 'node:fs';
import path from 'node:path';

const KNOWN_PATHS = [
  // Environment variables
  process.env.CHROMIUM_PATH,
  process.env.PLAYWRIGHT_CHROMIUM_PATH,
  process.env.PUPPETEER_EXECUTABLE_PATH,

  // Windows standard paths
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',

  // Linux / Docker container paths
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/lib/chromium/chromium',

  // macOS paths
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

// Add user AppData paths if on Windows
if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
  KNOWN_PATHS.push(
    path.join(process.env.LOCALAPPDATA, 'Microsoft\\Edge\\Application\\msedge.exe'),
    path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe')
  );
}

let cachedExecutablePath = null;

/**
 * Locate a valid Chromium/Edge/Chrome browser executable.
 *
 * @returns {string} Absolute path to executable
 * @throws {Error} If no supported Chromium binary is found
 */
export function findChromiumExecutable() {
  if (cachedExecutablePath && fs.existsSync(cachedExecutablePath)) {
    return cachedExecutablePath;
  }

  for (const candidate of KNOWN_PATHS) {
    if (candidate && typeof candidate === 'string' && fs.existsSync(candidate)) {
      cachedExecutablePath = candidate;
      return candidate;
    }
  }

  throw new Error(
    'No supported Chromium browser executable found. Set CHROMIUM_PATH or install Chromium/Edge/Chrome.'
  );
}
