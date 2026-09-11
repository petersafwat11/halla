/**
 * @halaa-checkin/api
 * Attendance Report A4 Template.
 * Generates Interim (draft/live) and Final (closed) attendance report PDFs
 * with statistics summary, attended guest list, and non-attended guest list.
 * Adheres to Technical Contract Sections 6 & 7 and Product Section 7.
 */

import { calculateStats } from '@halaa-checkin/contracts';
import { getCairoFontFacesCss, getHalaaLogoDataUrl } from './assets.js';
import { escapeHtml, formatDateTime, formatTime } from './helpers.js';

/**
 * Generate self-contained HTML for an attendance report.
 *
 * @param {object} params
 * @param {object} params.event
 * @param {Array<object>} params.guests - Full snapshot of active guests
 * @param {Date | string} params.snapshotAt - Snapshot timestamp
 * @param {string} [params.locale='ar']
 * @returns {string} HTML string
 */
export function generateReportHtml({ event, guests, snapshotAt, locale = 'ar' }) {
  const isAr = locale === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const fontFaces = getCairoFontFacesCss();
  const logoDataUrl = getHalaaLogoDataUrl();

  const isClosed = event.status === 'closed';

  // Calculate authoritative statistics
  const stats = calculateStats(guests);

  const eventName = escapeHtml(event.name);
  const venue = escapeHtml(event.venue);
  const eventDate = formatDateTime(event.startsAt, locale);
  const snapshotTime = formatDateTime(snapshotAt, locale);

  const labels = isAr
    ? {
        reportTitle: isClosed ? 'تقرير الحضور النهائي' : 'تقرير الحضور المرحلي',
        snapshotLabel: 'وقت إنشاء التقرير (توقيت الرياض Asia/Riyadh):',
        eventInfo: 'معلومات الفعالية',
        venueLabel: 'المكان:',
        dateLabel: 'الموعد:',
        statusLabel: 'حالة الفعالية:',
        statusValues: { draft: 'مسودة', live: 'مباشر', closed: 'مغلقة' },
        summaryTitle: 'ملخص الحضور',
        totalInvitations: 'إجمالي الدعوات',
        expectedPeople: 'العدد المتوقع',
        admittedInvitations: 'الدعوات المحضورة',
        actualAttendees: 'إجمالي الحاضرين',
        pendingInvitations: 'الدعوات المتبقية',
        invitationRate: 'نسبة حضور الدعوات',
        capacityRate: 'نسبة إشغال السعة',
        attendedSection: 'الضيوف الحاضرون',
        pendingSection: isClosed ? 'الضيوف الذين لم يحضروا' : 'الضيوف في انتظار تسجيل الدخول',
        nameCol: 'اسم الضيف',
        refCol: 'الرمز / المرجع',
        allowedCol: 'المرافقون المسموحون',
        actualCol: 'المرافقون الفعليون',
        partyCol: 'إجمالي الحضور',
        timeCol: 'وقت الدخول',
        operatorCol: 'الموظف',
        companionNamesCol: 'أسماء المرافقين (بيانات مرجعية)',
        noAttended: 'لم يتم تسجيل حضور أي ضيف حتى الآن.',
        noPending: isClosed ? 'حضر جميع الضيوف المدعوين.' : 'لا يوجد ضيوف متبقون في الانتظار.',
        companionsNotice: 'ملاحظة: أسماء المرافقين هي بيانات مرجعية مسجلة وقت الدعوة، وتوضح الجداول الأعداد الفعلية للحضور.',
      }
    : {
        reportTitle: isClosed ? 'Final Attendance Report' : 'Interim Attendance Report',
        snapshotLabel: 'Snapshot Time (Asia/Riyadh):',
        eventInfo: 'Event Information',
        venueLabel: 'Venue:',
        dateLabel: 'Date:',
        statusLabel: 'Event Status:',
        statusValues: { draft: 'Draft', live: 'Live', closed: 'Closed' },
        summaryTitle: 'Attendance Summary',
        totalInvitations: 'Total Invitations',
        expectedPeople: 'Expected People',
        admittedInvitations: 'Admitted Invitations',
        actualAttendees: 'Actual Attendees',
        pendingInvitations: 'Pending Invitations',
        invitationRate: 'Invitation Rate',
        capacityRate: 'Capacity Rate',
        attendedSection: 'Attended Guests',
        pendingSection: isClosed ? 'Did not attend' : 'Not yet admitted',
        nameCol: 'Guest Name',
        refCol: 'Code / Ref',
        allowedCol: 'Allowed',
        actualCol: 'Actual Companions',
        partyCol: 'Total Party',
        timeCol: 'Check-in Time',
        operatorCol: 'Operator',
        companionNamesCol: 'Invited Companion Names (Reference)',
        noAttended: 'No guests have checked in yet.',
        noPending: isClosed ? 'All invited guests attended.' : 'No pending guests.',
        companionsNotice: 'Note: Companion names are reference invitation data; report reflects authoritative headcount.',
      };

  const statusDisplay = escapeHtml(labels.statusValues[event.status] || event.status);
  const formatRate = (r) => `${Number(r || 0).toFixed(1)}`;

  // Separate attended and pending guests
  const attendedGuests = guests.filter((g) => g.checkIn !== null);
  const pendingGuests = guests.filter((g) => g.checkIn === null);

  // Render attended rows
  const attendedRowsHtml =
    attendedGuests.length > 0
      ? attendedGuests
          .map((g) => {
            const checkIn = g.checkIn;
            const timeStr = formatTime(checkIn.checkedInAt, locale);
            const refDisplay = g.reference ? `${g.shortCode} (${g.reference})` : g.shortCode;
            return `
        <tr>
          <td class="guest-cell" dir="auto"><strong>${escapeHtml(g.name)}</strong></td>
          <td class="code-cell"><bdi>${escapeHtml(refDisplay)}</bdi></td>
          <td class="num-cell">${g.allowedCompanions}</td>
          <td class="num-cell highlight-cell">${checkIn.actualCompanions}</td>
          <td class="num-cell highlight-cell"><strong>${checkIn.actualPartySize || 1 + checkIn.actualCompanions}</strong></td>
          <td class="time-cell">${escapeHtml(timeStr)}</td>
          <td class="op-cell">${escapeHtml(checkIn.operatorName)}</td>
        </tr>`;
          })
          .join('')
      : `<tr><td colspan="7" class="empty-message">${labels.noAttended}</td></tr>`;

  // Render pending rows
  const pendingRowsHtml =
    pendingGuests.length > 0
      ? pendingGuests
          .map((g) => {
            const refDisplay = g.reference ? `${g.shortCode} (${g.reference})` : g.shortCode;
            const companionList =
              g.companionNames && g.companionNames.length > 0
                ? g.companionNames.map(escapeHtml).join('، ')
                : '—';
            return `
        <tr>
          <td class="guest-cell" dir="auto"><strong>${escapeHtml(g.name)}</strong></td>
          <td class="code-cell"><bdi>${escapeHtml(refDisplay)}</bdi></td>
          <td class="num-cell">${g.allowedCompanions}</td>
          <td class="num-cell">1 + ${g.allowedCompanions}</td>
          <td class="comp-list-cell" dir="auto">${companionList}</td>
        </tr>`;
          })
          .join('')
      : `<tr><td colspan="5" class="empty-message">${labels.noPending}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
  <meta charset="utf-8">
  <title>${labels.reportTitle} - ${eventName}</title>
  <style>
    ${fontFaces}

    @page {
      size: A4 portrait;
      margin: 12mm 14mm 15mm 14mm;
      @bottom-center {
        content: counter(page);
        font-family: 'Cairo', sans-serif;
        font-size: 9px;
        color: #656565;
      }
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
      font-size: 10px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #c28e5c;
      padding-bottom: 4mm;
      margin-bottom: 4mm;
    }

    .header-logo {
      height: 28px;
      object-fit: contain;
    }

    .report-title {
      font-size: 18px;
      font-weight: 700;
      color: #2c2c2c;
      margin-bottom: 1mm;
    }

    .report-event-name {
      font-size: 13px;
      font-weight: 600;
      color: #c28e5c;
    }

    .meta-box {
      background: #fdfbf9;
      border: 1px solid #dfdfdf;
      border-radius: 6px;
      padding: 3mm 4mm;
      margin-bottom: 5mm;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      font-size: 9.5px;
    }

    .meta-item {
      margin: 1mm 2mm;
    }

    .meta-item strong {
      color: #656565;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 3mm;
      margin-bottom: 6mm;
    }

    .stat-card {
      background: #ffffff;
      border: 1px solid #dfdfdf;
      border-radius: 6px;
      padding: 3mm;
      text-align: center;
    }

    .stat-card.featured {
      background: #fdfaf6;
      border-color: #c28e5c;
    }

    .stat-value {
      font-size: 16px;
      font-weight: 700;
      color: #2c2c2c;
      margin-bottom: 0.5mm;
    }

    .stat-card.featured .stat-value {
      color: #c28e5c;
    }

    .stat-label {
      font-size: 9px;
      color: #656565;
      font-weight: 600;
    }

    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: #2c2c2c;
      border-bottom: 1px solid #dfdfdf;
      padding-bottom: 1.5mm;
      margin: 5mm 0 3mm 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-count {
      font-size: 10px;
      color: #656565;
      font-weight: normal;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4mm;
      font-size: 9px;
      page-break-inside: auto;
    }

    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    th {
      background: #f5ede4;
      color: #2c2c2c;
      font-weight: 700;
      padding: 2mm 2.5mm;
      border: 1px solid #dfdfdf;
      text-align: inherit;
    }

    td {
      padding: 2mm 2.5mm;
      border: 1px solid #dfdfdf;
      vertical-align: middle;
    }

    tr:nth-child(even) td {
      background: #fdfbf9;
    }

    .num-cell {
      text-align: center;
    }

    .highlight-cell {
      color: #c28e5c;
      font-weight: 600;
    }

    .code-cell {
      font-family: monospace;
      font-size: 8.5px;
      white-space: nowrap;
    }

    .empty-message {
      text-align: center;
      color: #656565;
      padding: 4mm;
      font-style: italic;
    }

    .comp-list-cell {
      font-size: 8.5px;
      color: #555555;
      max-width: 60mm;
    }

    .notice-footer {
      font-size: 8px;
      color: #9c8e7d;
      margin-top: 3mm;
      border-top: 1px dashed #dfdfdf;
      padding-top: 2mm;
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div>
      <div class="report-title">${labels.reportTitle}</div>
      <div class="report-event-name">${eventName}</div>
    </div>
    <img class="header-logo" src="${logoDataUrl}" alt="Halaa">
  </div>

  <div class="meta-box">
    <div class="meta-item"><strong>${labels.venueLabel}</strong> ${venue}</div>
    <div class="meta-item"><strong>${labels.dateLabel}</strong> ${eventDate}</div>
    <div class="meta-item"><strong>${labels.statusLabel}</strong> ${statusDisplay}</div>
    <div class="meta-item"><strong>${labels.snapshotLabel}</strong> ${snapshotTime}</div>
  </div>

  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">${stats.totalInvitations}</div>
      <div class="stat-label">${labels.totalInvitations}</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.expectedPeople}</div>
      <div class="stat-label">${labels.expectedPeople}</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.totalAllowedCompanions ?? 0}</div>
      <div class="stat-label">${isAr ? 'إجمالي المرافقين المسموحين' : 'Total Allowed Companions'}</div>
    </div>
    <div class="stat-card featured">
      <div class="stat-value">${stats.admittedInvitations}</div>
      <div class="stat-label">${labels.admittedInvitations}</div>
    </div>
    <div class="stat-card featured">
      <div class="stat-value">${stats.actualAttendees}</div>
      <div class="stat-label">${labels.actualAttendees}</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.actualCompanions ?? 0}</div>
      <div class="stat-label">${isAr ? 'المرافقون الحاضرون فعلاً' : 'Actual Companions'}</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.pendingInvitations}</div>
      <div class="stat-label">${labels.pendingInvitations}</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${formatRate(stats.invitationAttendanceRate)}%</div>
      <div class="stat-label">${labels.invitationRate}</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${formatRate(stats.capacityAttendanceRate)}%</div>
      <div class="stat-label">${labels.capacityRate}</div>
    </div>
  </div>

  <div class="section-title">
    <span>${labels.attendedSection}</span>
    <span class="section-count">${attendedGuests.length} / ${stats.totalInvitations}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>${labels.nameCol}</th>
        <th>${labels.refCol}</th>
        <th style="width: 14mm;">${labels.allowedCol}</th>
        <th style="width: 14mm;">${labels.actualCol}</th>
        <th style="width: 14mm;">${labels.partyCol}</th>
        <th style="width: 20mm;">${labels.timeCol}</th>
        <th style="width: 25mm;">${labels.operatorCol}</th>
      </tr>
    </thead>
    <tbody>
      ${attendedRowsHtml}
    </tbody>
  </table>

  <div class="section-title" style="margin-top: 6mm;">
    <span>${labels.pendingSection}</span>
    <span class="section-count">${pendingGuests.length} / ${stats.totalInvitations}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>${labels.nameCol}</th>
        <th>${labels.refCol}</th>
        <th style="width: 16mm;">${labels.allowedCol}</th>
        <th style="width: 16mm;">${labels.partyCol}</th>
        <th>${labels.companionNamesCol}</th>
      </tr>
    </thead>
    <tbody>
      ${pendingRowsHtml}
    </tbody>
  </table>

  <div class="notice-footer">
    ${labels.companionsNotice}
  </div>
</body>
</html>`;
}
