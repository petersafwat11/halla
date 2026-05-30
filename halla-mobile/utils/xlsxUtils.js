/**
 * Mobile XLSX I/O — expo-file-system + expo-sharing + expo-document-picker.
 * Header validation + row parsing are delegated to
 * `@halla/shared/utils/xlsx`.
 */
import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import {
  buildWorkbook,
  parseXlsxRowsToObjects,
} from "@halla/shared/utils/xlsx";

/**
 * Export a template XLSX file and trigger the native share/save sheet.
 */
export const exportTemplateXLSX = async (
  headers,
  sampleData = [],
  filename = "template"
) => {
  try {
    const wb = buildWorkbook(headers, sampleData);
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

    const result = parseXlsxRowsToObjects(rows, expectedHeaders, validateRow);

    if (result.invalidHeaders) {
      return {
        success: false,
        message: `أعمدة مفقودة: ${result.missing.join("، ")}`,
      };
    }

    return {
      success: true,
      data: result.data,
      errors: result.errors,
      message: `تم استيراد ${result.data.length} سجل${result.errors.length > 0 ? ` مع ${result.errors.length} خطأ` : ""}`,
    };
  } catch (error) {
    console.error("importFromXLSX error:", error);
    return { success: false, message: "حدث خطأ أثناء قراءة الملف" };
  }
};
