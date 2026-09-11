/**
 * @halaa-checkin/api
 * Chromium HTML-to-PDF Renderer.
 * Uses Playwright with local Chromium/Edge to render server-owned templates to PDF.
 * Enforces strict network request blocking, font-readiness guarantees, and resource cleanup.
 * Adheres to Technical Contract Section 7.
 */

import { chromium } from 'playwright-core';
import { findChromiumExecutable } from './chromium.js';

let browserInstance = null;
let browserPromise = null;

/**
 * Get or launch the singleton Chromium browser instance.
 *
 * @returns {Promise<import('playwright-core').Browser>}
 */
export async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  if (browserPromise) {
    return browserPromise;
  }

  const executablePath = findChromiumExecutable();

  browserPromise = chromium
    .launch({
      executablePath,
      timeout: 5000,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    })
    .then((browser) => {
      browserInstance = browser;
      browser.on('disconnected', () => {
        browserInstance = null;
        browserPromise = null;
      });
      return browser;
    })
    .finally(() => {
      browserPromise = null;
    });

  return browserPromise;
}

/**
 * Render an HTML document to PDF bytes.
 * Blocks all outbound network requests in the render context.
 * Waits for local fonts to be ready before capturing the PDF.
 *
 * @param {string} htmlContent - Full self-contained HTML string
 * @param {object} [options]
 * @param {string} [options.format='A4'] - 'A4' | 'A6'
 * @param {boolean} [options.landscape=false]
 * @param {{ top?: string, right?: string, bottom?: string, left?: string }} [options.margin]
 * @returns {Promise<Buffer>} PDF binary buffer
 */
export async function renderHtmlToPdf(
  htmlContent,
  {
    format = 'A4',
    landscape = false,
    margin,
    displayHeaderFooter = false,
    headerTemplate = '<span></span>',
    footerTemplate = '<div style="width:100%;text-align:center;font-size:8px;color:#656565;font-family:Cairo,sans-serif;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
  } = {}
) {
  // Sensible per-format defaults: A6 passes are full-bleed by design,
  // A4 bulk/report keep the template @page safe margins.
  const resolvedMargin = margin || (format === 'A6'
    ? { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
    : { top: '8mm', right: '6mm', bottom: '12mm', left: '6mm' });
  const browser = await getBrowser();
  const context = await browser.newContext({
    offline: true, // Offline mode prevents external network traffic
  });
  const page = await context.newPage();

  try {
    // SECURITY: Abort any attempted external network request
    await page.route('**/*', (route) => {
      route.abort();
    });

    await page.setContent(htmlContent, { waitUntil: 'load' });

    // Ensure embedded Cairo fonts are completely parsed and ready
    await page.evaluateHandle('document.fonts.ready');

    const pdfBuffer = await page.pdf({
      format,
      landscape,
      printBackground: true,
      margin: resolvedMargin,
      displayHeaderFooter,
      headerTemplate,
      footerTemplate,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    try {
      await page.close();
    } catch {
      // Ignore cleanup error
    }
    try {
      await context.close();
    } catch {
      // Ignore cleanup error
    }
  }
}

/**
 * Close browser instance and release resources on shutdown.
 *
 * @returns {Promise<void>}
 */
export async function closeBrowser() {
  if (browserPromise) {
    try {
      const browser = await browserPromise;
      await browser.close();
    } catch {
      // Ignore close errors
    }
  }

  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch {
      // Ignore close errors
    } finally {
      browserInstance = null;
      browserPromise = null;
    }
  }
}
