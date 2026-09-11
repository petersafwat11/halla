/**
 * @halaa-checkin/api
 * Bulk Passes A4 Template.
 * Formats multiple guest invitation passes in a 4-up A4 portrait layout (2x2 grid)
 * with safe cut lines and independent pagination.
 * Adheres to Technical Contract Section 7 and Product Section 7.
 */

import { getCairoFontFacesCss, getHalaaLogoDataUrl } from './assets.js';
import { escapeHtml, formatDateTime } from './helpers.js';

/**
 * Generate self-contained HTML for bulk A4 4-up guest passes.
 *
 * @param {object} params
 * @param {object} params.event
 * @param {Array<object>} params.guests - Array of safe guests with qrDataUrl
 * @param {string} [params.locale='ar']
 * @returns {string} HTML string
 */
export function generateBulkPassesHtml({ event, guests, locale = 'ar', snapshotAt = null }) {
  const isAr = locale === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const fontFaces = getCairoFontFacesCss();
  const logoDataUrl = getHalaaLogoDataUrl();

  const eventName = escapeHtml(event.name);
  const venue = escapeHtml(event.venue);
  const eventDate = formatDateTime(event.startsAt, locale);
  const snapshotLine = snapshotAt ? formatDateTime(snapshotAt, locale) : null;

  const labels = isAr
    ? {
        allowed: 'المرافقون:',
        total: 'الدخول:',
        people: 'أشخاص',
        person: 'شخص',
        instruction: 'يرجى إبراز رمز الاستجابة السريعة عند الدخول',
      }
    : {
        allowed: 'Companions:',
        total: 'Total:',
        people: 'people',
        person: 'person',
        instruction: 'Present this QR at the entrance',
      };

  // Chunk guests into pages of 4
  const pages = [];
  for (let i = 0; i < guests.length; i += 4) {
    pages.push(guests.slice(i, i + 4));
  }

  const renderCard = (guest) => {
    if (!guest) {
      return '<div class="pass-slot empty-slot"></div>';
    }

    const guestName = escapeHtml(guest.name);
    const shortCode = escapeHtml(guest.shortCode);
    const totalAllowed = (guest.allowedCompanions || 0) + 1;
    const partyUnit = totalAllowed === 1 ? labels.person : labels.people;

    return `
      <div class="pass-slot">
        <div class="pass-card">
          <div class="card-top">
            <div class="header-row">
              <img class="logo-img" src="${logoDataUrl}" alt="Halaa">
              <div class="event-title">${eventName}</div>
            </div>
            <div class="event-meta">
              <span>${venue}</span> &bull; <span>${eventDate}</span>
            </div>
            <div class="divider"></div>
            <div class="guest-info">
              <div class="guest-name" dir="auto">${guestName}</div>
              <div class="guest-counts">
                ${labels.allowed} ${guest.allowedCompanions} | ${labels.total} ${totalAllowed} ${partyUnit}
              </div>
            </div>
          </div>

          <div class="qr-area">
            <img class="qr-code-img" src="${guest.qrDataUrl}" alt="QR">
            <bdi class="short-code-label">${shortCode}</bdi>
          </div>

          <div class="footer-msg">
            ${labels.instruction}
          </div>
        </div>
      </div>
    `;
  };

  const pagesHtml = pages
    .map(
      (pageGuests, pageIdx) => `
    <div class="page-sheet ${pageIdx === pages.length - 1 ? 'last-page' : ''}">
      <div class="cut-guide-horizontal"></div>
      <div class="cut-guide-vertical"></div>
      <div class="grid-container">
        ${renderCard(pageGuests[0])}
        ${renderCard(pageGuests[1])}
        ${renderCard(pageGuests[2])}
        ${renderCard(pageGuests[3])}
      </div>
      ${snapshotLine ? `<div class="snapshot-line">${isAr ? 'وقت النسخة (توقيت الرياض Asia/Riyadh): ' : 'Snapshot (Asia/Riyadh): '}${snapshotLine}</div>` : ''}
    </div>
  `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <title>${eventName} - Passes</title>
  <style>
    ${fontFaces}

    @page {
      size: A4 portrait;
      margin: 8mm 6mm;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: #ffffff;
      font-family: 'Cairo', sans-serif;
      color: #2c2c2c;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page-sheet {
      width: 100%;
      height: 280mm; /* Fits A4 margins with room for Chromium rounding. */
      break-inside: avoid;
      page-break-after: always;
      position: relative;
      overflow: hidden;
    }

    .page-sheet.last-page {
      page-break-after: auto;
    }

    /* Subtle dotted cut marks */
    .cut-guide-horizontal {
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      border-top: 1px dashed #d6cbbf;
      z-index: 10;
      pointer-events: none;
    }

    .cut-guide-vertical {
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      border-left: 1px dashed #d6cbbf;
      z-index: 10;
      pointer-events: none;
    }

    .grid-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      width: 100%;
      height: ${snapshotLine ? 'calc(100% - 6mm)' : '100%'};
      gap: 5mm;
    }

    .pass-slot {
      padding: 3mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-slot {
      visibility: hidden;
    }

    .pass-card {
      width: 100%;
      height: 100%;
      max-width: 92mm;
      max-height: 133mm;
      background: #fdfbf9;
      border: 1px solid #dfdfdf;
      border-radius: 8px;
      padding: 4.5mm 5mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
    }

    .header-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2mm;
      margin-bottom: 1.5mm;
    }

    .logo-img {
      height: 16px;
      object-fit: contain;
    }

    .event-title {
      font-size: 11px;
      font-weight: 700;
      color: #c28e5c;
      line-height: 1.3;
      word-break: break-word;
      overflow-wrap: break-word;
    }

    .event-meta {
      font-size: 8.5px;
      color: #656565;
      line-height: 1.2;
      margin-bottom: 1.5mm;
    }

    .divider {
      border-top: 1px dashed #dfdfdf;
      margin: 1mm 0 2mm 0;
    }

    .guest-info {
      margin-bottom: 1mm;
    }

    .guest-name {
      font-size: 13px;
      font-weight: 700;
      color: #2c2c2c;
      line-height: 1.25;
      margin-bottom: 0.8mm;
      word-break: break-word;
      overflow-wrap: break-word;
    }

    .guest-counts {
      font-size: 9px;
      color: #656565;
      font-weight: 600;
    }

    .qr-area {
      margin: 1mm auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .qr-code-img {
      width: 38mm;
      height: 38mm;
      display: block;
      background: #ffffff;
      border: 1px solid #dfdfdf;
      border-radius: 4px;
      padding: 1.5mm;
    }

    .short-code-label {
      font-family: 'Cairo', monospace;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: #2c2c2c;
      margin-top: 1mm;
    }

    .footer-msg {
      font-size: 8px;
      color: #656565;
      margin-top: 1mm;
    }
    .snapshot-line {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      font-size: 7px;
      color: #656565;
      text-align: center;
      padding: 2mm 0;
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;
}
