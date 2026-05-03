/**
 * Phase 4 W3-ADMIN — small helpers for downloading server-generated
 * binary files (XLSX, PDF, etc.) and surfacing the native share sheet.
 *
 * Why this exists: the existing `xlsxUtils.exportTemplateXLSX` builds
 * the spreadsheet client-side and then writes-to-cache + shares. The
 * Phase 4 host exports come from the BACKEND as a Blob — we need a
 * helper that:
 *   1. converts a Blob to a base64 string (FileReader is the
 *      RN-compatible path on Hermes; ArrayBuffer + base64 encoding
 *      works for older runtimes),
 *   2. writes it to cache via expo-file-system,
 *   3. shares via expo-sharing (the user picks "Save to Files",
 *      "Send to ..." etc.).
 *
 * Both helpers return `{ success, message, fileUri? }`.
 */

import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Convert a fetched Blob to a base64 string. Uses FileReader, which is
 * the most portable approach on React Native (Hermes ships with one).
 */
const _blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("FileReader error"));
    reader.onload = () => {
      // result is a `data:<mime>;base64,<payload>` URI — strip the prefix.
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unexpected FileReader result type"));
        return;
      }
      const commaIdx = result.indexOf(",");
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.readAsDataURL(blob);
  });

/**
 * Write a Blob to the cache directory under `filename` and trigger the
 * share sheet.
 *
 * @param {Blob} blob
 * @param {string} filename - filename including extension (e.g. "events.xlsx")
 * @param {Object} [opts]
 * @param {string} [opts.mimeType=XLSX_MIME]
 * @param {string} [opts.dialogTitle]
 * @param {string} [opts.UTI="com.microsoft.excel.xlsx"]
 * @returns {Promise<{success, message, fileUri?}>}
 */
export const saveBlobAndShare = async (blob, filename, opts = {}) => {
  if (!blob) return { success: false, message: "لا توجد بيانات للحفظ" };
  const {
    mimeType = XLSX_MIME,
    dialogTitle = "حفظ الملف",
    UTI = "com.microsoft.excel.xlsx",
  } = opts;
  try {
    const base64 = await _blobToBase64(blob);
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      // The file is at fileUri; the caller can surface a fallback.
      return {
        success: true,
        message: "تم حفظ الملف. المشاركة غير متاحة على هذا الجهاز.",
        fileUri,
      };
    }

    await Sharing.shareAsync(fileUri, {
      mimeType,
      dialogTitle,
      UTI,
    });

    return { success: true, message: "تم تصدير الملف بنجاح", fileUri };
  } catch (error) {
    console.error("[download] saveBlobAndShare failed:", error);
    return {
      success: false,
      message: error?.message || "حدث خطأ أثناء حفظ الملف",
    };
  }
};

export default { saveBlobAndShare };
