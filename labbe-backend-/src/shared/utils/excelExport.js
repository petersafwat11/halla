const xlsx = require("xlsx");
const config = require("../../config");
const { ValidationError } = require("../../shared/errors");

/**
 * FLOW-28-F02: Export row cap.
 *
 * Reads `EXPORT_MAX_ROWS` from env (default 10,000). Throws a 422
 * ValidationError if the document count exceeds the limit.
 *
 * @param {number} count - number of documents that would be exported
 * @param {string} entityName - human-readable entity name (e.g. "guests", "events")
 * @throws {ValidationError} if count exceeds limit
 */
const guardExportMaxRows = (count, entityName = "records") => {
  const maxRows = config.EXPORT_MAX_ROWS ?? 10_000;
  if (count > maxRows) {
    throw new ValidationError(
      `Export exceeds the maximum of ${maxRows.toLocaleString()} ${entityName}. ` +
      `Please narrow your filters (date range, status, search) and try again.`
    );
  }
};

/**
 * Generates an Excel file from the provided data
 * @param {Array} data - Array of objects to be converted to Excel
 * @param {string} filename - Name of the file to be generated (without extension)
 * @returns {Buffer} Excel file buffer
 */
const generateExcel = (data, filename) => {
  // Create a new workbook
  const workbook = xlsx.utils.book_new();

  // Convert data to worksheet
  const worksheet = xlsx.utils.json_to_sheet(data);

  // Add the worksheet to the workbook
  xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  // Generate buffer
  const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

  return buffer;
};

module.exports = {
  generateExcel,
  guardExportMaxRows,
};
