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

// SDK 54 (expo-file-system 19) moved the classic file API
// (`cacheDirectory`, `writeAsStringAsync`, `EncodingType`, …) to the
// `/legacy` entry point — the default module now exports only the new
// `File`/`Directory`/`Paths` classes. Importing from the bare package made
// `FileSystem.EncodingType` undefined, so `saveBlobAndShare` threw on every
// export (host events + all admin tables + tickets). Pin to `/legacy`.
import * as FileSystem from "expo-file-system/legacy";
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
 * Soft cap on the export size so we don't OOM Hermes by reading a 100MB
 * blob into memory before base64-encoding it. Tweak if real exports
 * grow past this bound.
 */
const MAX_EXPORT_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

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
 * @returns {Promise<{success, message, fileUri?, canceled?}>}
 *
 * Returns:
 *   - `{ success: true, fileUri }` when the share sheet completes.
 *   - `{ success: true, fileUri, canceled: true }` when the user
 *     dismisses the share sheet (callers should treat as OK, not error).
 *   - `{ success: true, fileUri, message }` when sharing isn't
 *     available (file is on disk; caller may surface a custom UI).
 *   - `{ success: false, message }` on any other failure.
 */
export const saveBlobAndShare = async (blob, filename, opts = {}) => {
  if (!blob) return { success: false, message: "لا توجد بيانات للحفظ" };
  if (typeof blob.size === "number" && blob.size > MAX_EXPORT_SIZE_BYTES) {
    return {
      success: false,
      message: `الملف أكبر من الحد المسموح للتصدير (${Math.round(MAX_EXPORT_SIZE_BYTES / (1024 * 1024))} ميجابايت).`,
    };
  }
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

    try {
      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle,
        UTI,
      });
      return { success: true, message: "تم تصدير الملف بنجاح", fileUri };
    } catch (shareErr) {
      // expo-sharing surfaces a "user cancelled" path on iOS as a
      // thrown Error with message containing "cancelled" / "dismiss".
      // Treat that as success-with-canceled so the caller doesn't show
      // a scary error toast for what the user explicitly dismissed.
      const message = String(shareErr?.message || "");
      if (/cancel|dismiss/i.test(message)) {
        return {
          success: true,
          message: null,
          fileUri,
          canceled: true,
        };
      }
      throw shareErr;
    }
  } catch (error) {
    console.error("[download] saveBlobAndShare failed:", error);
    return {
      success: false,
      message: error?.message || "حدث خطأ أثناء حفظ الملف",
    };
  }
};

export default { saveBlobAndShare };
