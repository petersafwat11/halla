const xlsx = require("xlsx");

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
};
