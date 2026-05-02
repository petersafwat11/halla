/**
 * General XLSX Export/Import Functions
 * Can be used for staff, guests, or any other data type
 */
import * as XLSX from "xlsx";

/**
 * Export data to XLSX file
 * @param {Array} headers - Array of header objects with key and label
 * @param {Array} data - Array of data objects (optional, for template can be empty)
 * @param {string} filename - Name of the file to download
 * @param {boolean} isTemplate - If true, exports empty template with headers only
 */
export const exportToXLSX = (
  headers,
  data = [],
  filename = "export",
  isTemplate = false
) => {
  try {
    // Create worksheet data
    const wsData = [
      // Headers row
      headers.map((header) => header.label),
    ];

    if (!isTemplate && data.length > 0) {
      // Add data rows
      data.forEach((row) => {
        const rowData = headers.map((header) => row[header.key] || "");
        wsData.push(rowData);
      });
    }

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    // Write to file and trigger download
    XLSX.writeFile(wb, `${filename}.xlsx`);

    return { success: true, message: "File downloaded successfully" };
  } catch (error) {
    console.error("Error exporting XLSX:", error);
    return { success: false, message: "Error exporting file" };
  }
};

/**
 * Import data from XLSX file
 * @param {File} file - The XLSX file to import
 * @param {Array} expectedHeaders - Array of expected header objects with key and label
 * @param {Function} validateRow - Function to validate each row of data
 * @returns {Promise} Promise that resolves with imported data or rejects with error
 */
export const importFromXLSX = (file, expectedHeaders, validateRow) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject({ success: false, message: "No file selected" });
      return;
    }

    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
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

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to array of objects
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rows.length === 0) {
          reject({ success: false, message: "File is empty" });
          return;
        }

        // Get headers from first row
        const fileHeaders = rows[0].map((header) => String(header).trim());

        // Validate headers
        const expectedHeaderLabels = expectedHeaders.map((h) => h.label);
        const missingHeaders = expectedHeaderLabels.filter(
          (expectedHeader) => !fileHeaders.includes(expectedHeader)
        );

        if (missingHeaders.length > 0) {
          reject({
            success: false,
            message: `Missing required headers: ${missingHeaders.join(", ")}`,
          });
          return;
        }

        // Create header mapping
        const headerMap = {};
        expectedHeaders.forEach((expectedHeader) => {
          const fileHeaderIndex = fileHeaders.indexOf(expectedHeader.label);
          if (fileHeaderIndex !== -1) {
            headerMap[expectedHeader.key] = fileHeaderIndex;
          }
        });

        // Parse data rows
        const importedData = [];
        const errors = [];

        // Process each row (skip header row)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const rowNumber = i + 1; // Excel row numbers start at 1

          if (!row || row.length === 0) continue; // Skip empty rows

          // Create data object
          const rowData = {};
          expectedHeaders.forEach((header) => {
            const columnIndex = headerMap[header.key];
            if (columnIndex !== undefined && row[columnIndex] !== undefined) {
              rowData[header.key] = String(row[columnIndex]).trim();
            } else {
              rowData[header.key] = "";
            }
          });

          // Validate row
          const validation = validateRow(rowData, rowNumber);
          if (validation.isValid) {
            importedData.push({
              ...rowData,
              id: Date.now() + Math.random(), // Generate unique ID
            });
          } else {
            errors.push({
              row: rowNumber,
              data: rowData,
              errors: validation.errors,
            });
          }
        }

        resolve({
          success: true,
          data: importedData,
          errors: errors,
          message: `Successfully imported ${importedData.length} rows${
            errors.length > 0 ? ` with ${errors.length} errors` : ""
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

/**
 * Validate staff data
 * @param {Object} data - Staff data to validate
 * @param {number} rowNumber - Row number for error reporting
 * @returns {Object} Validation result
 */
export const validateStaffRow = (data, rowNumber) => {
  const errors = [];

  // Name validation
  if (!data.name || !data.name.trim()) {
    errors.push("Name is required");
  }

  // Mobile validation
  if (!data.mobile || !data.mobile.trim()) {
    errors.push("Mobile number is required");
  } else if (!/^[0-9]{9,15}$/.test(data.mobile.trim())) {
    errors.push("Mobile number must be 9-15 digits");
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
};

/**
 * Validate guest data
 * @param {Object} data - Guest data to validate
 * @param {number} rowNumber - Row number for error reporting
 * @returns {Object} Validation result
 */
export const validateGuestRow = (data, rowNumber) => {
  const errors = [];

  // Name validation
  if (!data.name || !data.name.trim()) {
    errors.push("Name is required");
  }

  // Mobile validation
  if (!data.mobile || !data.mobile.trim()) {
    errors.push("Mobile number is required");
  } else if (!/^[0-9]{9,15}$/.test(data.mobile.trim())) {
    errors.push("Mobile number must be 9-15 digits");
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
};
