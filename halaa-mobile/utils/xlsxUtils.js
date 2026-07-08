/**
 * Mobile XLSX I/O — expo-file-system + expo-sharing + expo-document-picker.
 * Header validation + row parsing are delegated to
 * `@halaa/shared/utils/xlsx`.
 */
import * as XLSX from "xlsx";
// SDK 54 (expo-file-system 19) moved the classic file API to `/legacy`; the
// bare module no longer exports `cacheDirectory` / `writeAsStringAsync` /
// `readAsStringAsync` / `EncodingType`. Without `/legacy`, template export and
// XLSX import both threw on `EncodingType.Base64`.
import * as FileSystem from "expo-file-system/legacy";
import * as DocumentPicker from "expo-document-picker";
import {
  buildWorkbook,
  parseXlsxRowsToObjects,
} from "@halaa/shared/utils/xlsx";
import { saveBase64ToDevice } from "./download";

/**
 * Export a template XLSX file to the user's device (download on Android,
 * "Save to Files" on iOS — see utils/download.js).
 */
export const exportTemplateXLSX = async (
  headers,
  sampleData = [],
  filename = "template"
) => {
  try {
    const wb = buildWorkbook(headers, sampleData);
    const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    return await saveBase64ToDevice(base64, `${filename}.xlsx`, {
      dialogTitle: "حفظ القالب",
    });
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
