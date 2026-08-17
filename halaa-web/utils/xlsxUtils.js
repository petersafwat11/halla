/**
 * Web XLSX I/O — browser download (`XLSX.writeFile`) for export,
 * FileReader for import. Header validation + row parsing are delegated
 * to `@halaa/shared/utils/xlsx`.
 */
import * as XLSX from "xlsx";
import {
  buildWorkbook,
  parseXlsxRowsToObjects,
  validateStaffRow,
  validateGuestRow,
} from "@halaa/shared/utils/xlsx";

export { validateStaffRow, validateGuestRow };

/**
 * Export data to XLSX file (template or full export).
 * @param {Array} headers - [{ key, label }, ...]
 * @param {Array} data - Optional rows (skipped when isTemplate)
 * @param {string} filename - Without extension
 * @param {boolean} isTemplate
 */
export const exportToXLSX = (
  headers,
  data = [],
  filename = "export",
  isTemplate = false
) => {
  try {
    const rows = isTemplate ? [] : data;
    const wb = buildWorkbook(headers, rows);
    XLSX.writeFile(wb, `${filename}.xlsx`);
    return { success: true, message: "File downloaded successfully" };
  } catch (error) {
    console.error("Error exporting XLSX:", error);
    return { success: false, message: "Error exporting file" };
  }
};

/**
 * Import data from XLSX file using browser FileReader.
 * @param {File} file
 * @param {Array} expectedHeaders - [{ key, label }, ...]
 * @param {Function} validateRow - (rowData, rowNumber) => { isValid, errors }
 */
export const importFromXLSX = (file, expectedHeaders, validateRow) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject({ success: false, message: "No file selected" });
      return;
    }

    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];

    if (!allowedTypes.includes(file.type)) {
      reject({
        success: false,
        message: "Please select an Excel file (.xlsx or .xls)",
      });
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rows.length === 0) {
          reject({ success: false, message: "File is empty" });
          return;
        }

        const result = parseXlsxRowsToObjects(rows, expectedHeaders, validateRow);

        if (result.invalidHeaders) {
          reject({
            success: false,
            message: `Missing required headers: ${result.missing.join(", ")}`,
          });
          return;
        }

        resolve({
          success: true,
          data: result.data,
          errors: result.errors,
          message: `Successfully imported ${result.data.length} rows${
            result.errors.length > 0 ? ` with ${result.errors.length} errors` : ""
          }`,
        });
      } catch (error) {
        console.error("Error parsing XLSX:", error);
        reject({ success: false, message: "Error parsing Excel file" });
      }
    };

    reader.onerror = () => {
      reject({ success: false, message: "Error reading file" });
    };

    reader.readAsArrayBuffer(file);
  });
};
