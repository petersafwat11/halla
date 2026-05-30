/**
 * Platform-pure XLSX helpers — sheet builders, header validators, row
 * mappers. I/O (download / share / file picker) stays per-app because
 * web uses the DOM and mobile uses expo-file-system + expo-sharing +
 * expo-document-picker.
 */

import * as XLSX from "xlsx";

/**
 * Build an array-of-arrays (AOA) for a worksheet.
 * @param {Array<{ key: string, label: string }>} headers
 * @param {Array<Record<string, unknown>>} [dataRows]
 * @returns {Array<Array<unknown>>}
 */
export const buildSheetAOA = (headers, dataRows = []) => {
  const rows = [headers.map((h) => h.label)];
  for (const row of dataRows) {
    rows.push(headers.map((h) => row[h.key] ?? ""));
  }
  return rows;
};

/**
 * Build a single-sheet workbook from headers + data rows.
 */
export const buildWorkbook = (headers, dataRows = [], sheetName = "Sheet1") => {
  const ws = XLSX.utils.aoa_to_sheet(buildSheetAOA(headers, dataRows));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
};

/**
 * Validate that every expected header label appears in the file's
 * header row.
 *
 * @returns {{ ok: true, headerMap: Record<string, number> } | { ok: false, missing: string[] }}
 */
export const validateXlsxHeaders = (fileHeaders, expectedHeaders) => {
  const expectedLabels = expectedHeaders.map((h) => h.label);
  const missing = expectedLabels.filter((l) => !fileHeaders.includes(l));
  if (missing.length > 0) return { ok: false, missing };

  const headerMap = {};
  for (const h of expectedHeaders) {
    const idx = fileHeaders.indexOf(h.label);
    if (idx !== -1) headerMap[h.key] = idx;
  }
  return { ok: true, headerMap };
};

/**
 * Parse XLSX rows (already extracted via `XLSX.utils.sheet_to_json(..., { header: 1 })`)
 * into validated row objects.
 *
 * @param {Array<Array<unknown>>} rows  AOA from sheet_to_json
 * @param {Array<{ key: string, label: string }>} expectedHeaders
 * @param {(rowData: Record<string,string>, rowNumber: number) => { isValid: boolean, errors: string[] }} validateRow
 * @returns {{ data: object[], errors: object[] } | { invalidHeaders: true, missing: string[] }}
 */
export const parseXlsxRowsToObjects = (rows, expectedHeaders, validateRow) => {
  if (!rows || rows.length === 0) {
    return { data: [], errors: [] };
  }

  const fileHeaders = rows[0].map((h) => String(h).trim());
  const validation = validateXlsxHeaders(fileHeaders, expectedHeaders);
  if (!validation.ok) {
    return { invalidHeaders: true, missing: validation.missing };
  }

  const { headerMap } = validation;
  const data = [];
  const errors = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rowData = {};
    for (const h of expectedHeaders) {
      const col = headerMap[h.key];
      rowData[h.key] =
        col !== undefined && row[col] !== undefined
          ? String(row[col]).trim()
          : "";
    }

    const result = validateRow(rowData, i + 1);
    if (result.isValid) {
      data.push({ ...rowData, id: Date.now() + Math.random() });
    } else {
      errors.push({ row: i + 1, errors: result.errors });
    }
  }

  return { data, errors };
};

/**
 * Shared row validators — same regex + required-field rules for both apps.
 * Error strings stay in English here; callers can map to Arabic at the
 * surface if needed.
 */
export const validateStaffRow = (data) => {
  const errors = [];
  if (!data.name || !data.name.trim()) errors.push("Name is required");
  if (!data.mobile || !data.mobile.trim()) {
    errors.push("Mobile number is required");
  } else if (!/^[0-9]{9,15}$/.test(data.mobile.trim())) {
    errors.push("Mobile number must be 9-15 digits");
  }
  return { isValid: errors.length === 0, errors };
};

export const validateGuestRow = (data) => {
  const errors = [];
  if (!data.name || !data.name.trim()) errors.push("Name is required");
  if (!data.mobile || !data.mobile.trim()) {
    errors.push("Mobile number is required");
  } else if (!/^[0-9]{9,15}$/.test(data.mobile.trim())) {
    errors.push("Mobile number must be 9-15 digits");
  }
  return { isValid: errors.length === 0, errors };
};
