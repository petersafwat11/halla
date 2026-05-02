/**
 * Mobile XLSX Export/Import Utilities
 * Uses xlsx + expo-file-system + expo-sharing + expo-document-picker
 */
import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";

/**
 * Export a template XLSX file and trigger the native share/save sheet.
 * @param {Array} headers  - [{ key, label }, ...]
 * @param {Array} sampleData - Optional sample rows for the template
 * @param {string} filename - Base filename (without extension)
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const exportTemplateXLSX = async (
  headers,
  sampleData = [],
  filename = "template"
) => {
  try {
    const wsData = [
      headers.map((h) => h.label),
      ...sampleData.map((row) => headers.map((h) => row[h.key] || "")),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

    const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    const fileUri = FileSystem.cacheDirectory + filename + ".xlsx";

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      return { success: false, message: "المشاركة غير متاحة على هذا الجهاز" };
    }

    await Sharing.shareAsync(fileUri, {
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "حفظ القالب",
      UTI: "com.microsoft.excel.xlsx",
    });

    return { success: true, message: "تم تصدير القالب بنجاح" };
  } catch (error) {
    console.error("exportTemplateXLSX error:", error);
    return { success: false, message: "حدث خطأ أثناء تصدير القالب" };
  }
};

/**
 * Let the user pick an XLSX/XLS file, parse it, and return validated rows.
 * @param {Array} expectedHeaders - [{ key, label }, ...]
 * @param {Function} validateRow  - (rowData, rowNumber) => { isValid, errors: [] }
 * @returns {Promise<{ canceled, success, data, errors, message }>}
 */
export const importFromXLSX = async (expectedHeaders, validateRow) => {
  try {
    const pickerResult = await DocumentPicker.getDocumentAsync({
      type: [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/octet-stream",
        "*/*",
      ],
      copyToCacheDirectory: true,
    });

    if (pickerResult.canceled) {
      return { canceled: true };
    }

    const fileUri = pickerResult.assets[0].uri;
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const workbook = XLSX.read(base64, { type: "base64" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

    if (!rows || rows.length === 0) {
      return { success: false, message: "الملف فارغ" };
    }

    // Validate headers
    const fileHeaders = rows[0].map((h) => String(h).trim());
    const expectedLabels = expectedHeaders.map((h) => h.label);
    const missing = expectedLabels.filter((l) => !fileHeaders.includes(l));

    if (missing.length > 0) {
      return {
        success: false,
        message: `أعمدة مفقودة: ${missing.join("، ")}`,
      };
    }

    // Build column index map
    const headerMap = {};
    expectedHeaders.forEach((h) => {
      const idx = fileHeaders.indexOf(h.label);
      if (idx !== -1) headerMap[h.key] = idx;
    });

    const importedData = [];
    const errors = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const rowData = {};
      expectedHeaders.forEach((h) => {
        const col = headerMap[h.key];
        rowData[h.key] =
          col !== undefined && row[col] !== undefined
            ? String(row[col]).trim()
            : "";
      });

      const validation = validateRow(rowData, i + 1);
      if (validation.isValid) {
        importedData.push({ ...rowData, id: Date.now() + Math.random() });
      } else {
        errors.push({ row: i + 1, errors: validation.errors });
      }
    }

    return {
      success: true,
      data: importedData,
      errors,
      message: `تم استيراد ${importedData.length} سجل${errors.length > 0 ? ` مع ${errors.length} خطأ` : ""}`,
    };
  } catch (error) {
    console.error("importFromXLSX error:", error);
    return { success: false, message: "حدث خطأ أثناء قراءة الملف" };
  }
};
