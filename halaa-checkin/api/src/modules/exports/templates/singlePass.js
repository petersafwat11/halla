/**
 * @halaa-checkin/api
 * Single Pass A6 Template.
 * Formats one guest invitation pass for A6 portrait printing (105mm x 148mm).
 * Adheres to Technical Contract Section 7 and Product Section 7.
 */

import { getCairoFontFacesCss, getHalaaLogoDataUrl } from './assets.js';
import { escapeHtml, formatDateTime } from './helpers.js';

/**
 * Generate full self-contained HTML for an A6 guest pass.
 *
 * @param {object} params
 * @param {object} params.event
 * @param {object} params.guest - Safe guest data with qrDataUrl
 * @param {string} [params.locale='ar']
 * @returns {string} HTML string
 */
export function generateSinglePassHtml({ event, guest, locale = 'ar', snapshotAt = null }) {
  const isAr = locale === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const fontFaces = getCairoFontFacesCss();
  const logoDataUrl = getHalaaLogoDataUrl();

  const eventName = escapeHtml(event.name);
  const venue = escapeHtml(event.venue);
  const eventDate = formatDateTime(event.startsAt, locale);
  const snapshotLine = snapshotAt ? formatDateTime(snapshotAt, locale) : null;
  const guestName = escapeHtml(guest.name);
  const shortCode = escapeHtml(guest.shortCode);

  const labels = isAr
    ? {
        allowed: 'المرافقون المسموح بهم:',
        total: 'إجمالي الدخول:',
        people: 'أشخاص',
        person: 'شخص',
        instruction: 'يرجى إبراز رمز الاستجابة السريعة عند الدخول',
        passTitle: 'بطاقة دعوة خاصة',
      }
    : {
        allowed: 'Companions allowed:',
        total: 'Total admission:',
        people: 'people',
        person: 'person',
        instruction: 'Present this QR at the entrance',
        passTitle: 'Private Invitation Pass',
      };

  const totalAllowed = (guest.allowedCompanions || 0) + 1;
  const partyUnit = totalAllowed === 1 ? labels.person : labels.people;

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <title>${eventName} - ${guestName}</title>
  <style>
    ${fontFaces}

    @page {
      size: 105mm 148mm; /* A6 portrait */
      margin: 0;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      width: 105mm;
      height: 148mm;
      background-color: #f9f4ef;
      font-family: 'Cairo', sans-serif;
      color: #2c2c2c;
      padding: 6mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .pass-card {
      width: 93mm;
      height: 136mm;
      background: #ffffff;
      border: 1px solid #dfdfdf;
      border-radius: 10px;
      padding: 5mm 6mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      position: relative;
    }

    .header-logo {
      height: 22px;
      margin-bottom: 3mm;
      object-fit: contain;
    }

    .event-title {
      font-size: 13px;
      font-weight: 700;
      color: #c28e5c;
      line-height: 1.3;
      margin-bottom: 1.5mm;
      word-break: break-word;
    }

    .event-meta {
      font-size: 9.5px;
      color: #656565;
      line-height: 1.3;
      margin-bottom: 2mm;
    }

    .divider {
      border-top: 1px dashed #dfdfdf;
      margin: 1.5mm 0 3mm 0;
    }

    .guest-section {
      margin-bottom: 2mm;
    }

    .guest-name {
      font-size: 15px;
      font-weight: 700;
      color: #2c2c2c;
      line-height: 1.3;
      margin-bottom: 1mm;
      word-break: break-word;
      overflow-wrap: break-word;
    }

    .guest-allowance {
      font-size: 10px;
      color: #656565;
      font-weight: 600;
    }

    .qr-container {
      margin: 1mm auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .qr-image {
      width: 40mm;
      height: 40mm;
      display: block;
      background: #ffffff;
      border: 1px solid #dfdfdf;
      border-radius: 6px;
      padding: 1.5mm;
    }

    .short-code {
      font-family: 'Cairo', monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: #2c2c2c;
      margin-top: 1.5mm;
      display: inline-block;
    }

    .footer-instruction {
      font-size: 9px;
      color: #656565;
      line-height: 1.2;
      margin-top: 1mm;
    }
    .snapshot-line {
      font-size: 7.5px;
      color: #656565;
      margin-top: 1mm;
    }
  </style>
</head>
<body>
  <div class="pass-card">
    <div>
      <img class="header-logo" src="${logoDataUrl}" alt="Halaa">
      <h1 class="event-title">${eventName}</h1>
      <div class="event-meta">
        <div>${venue}</div>
        <div>${eventDate}</div>
      </div>
      <div class="divider"></div>
      <div class="guest-section">
        <h2 class="guest-name" dir="auto">${guestName}</h2>
        <div class="guest-allowance">
          ${labels.allowed} ${guest.allowedCompanions} | ${labels.total} ${totalAllowed} ${partyUnit}
        </div>
      </div>
    </div>

    <div class="qr-container">
      <img class="qr-image" src="${guest.qrDataUrl}" alt="QR">
      <bdi class="short-code">${shortCode}</bdi>
    </div>

    <div class="footer-instruction">
      ${labels.instruction}
    </div>
    ${snapshotLine ? `<div class="snapshot-line">${isAr ? 'وقت النسخة (توقيت الرياض Asia/Riyadh): ' : 'Snapshot (Asia/Riyadh): '}${snapshotLine}</div>` : ''}
  </div>
</body>
</html>`;
}
