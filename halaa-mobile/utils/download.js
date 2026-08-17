/**
 * Helpers for saving server-generated binary files (XLSX, PDF, …) to the
 * user's device.
 *
 * Behaviour (per product decision — download, don't "share"):
 *   - Android: write the file directly into a user-chosen folder (Downloads
 *     by default) via the Storage Access Framework. The folder grant is
 *     requested once and persisted, so subsequent exports save silently and
 *     surface a native "saved" toast. No share sheet.
 *   - iOS: there is no general Downloads folder for arbitrary files, so we
 *     open the system "Save to Files" sheet (the iOS-native way to download a
 *     document). This is `Sharing.shareAsync`, whose primary action is
 *     "Save to Files".
 *
 * `saveBlobToDevice` is the canonical name; `saveBlobAndShare` is kept as a
 * back-compat alias so existing imports keep working.
 */

import { Platform, ToastAndroid } from "react-native";
// SDK 54 (expo-file-system 19) moved the classic file API (`cacheDirectory`,
// `writeAsStringAsync`, `EncodingType`, `StorageAccessFramework`, …) to the
// `/legacy` entry point — the default module now exports only the new
// `File`/`Directory`/`Paths` classes. Pin to `/legacy`.
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Persisted Storage Access Framework directory grant (Android). Stored once
// the user picks an export folder so we don't re-prompt on every export.
const SAF_DIR_KEY = "halla:exportDirUri";

/**
 * Soft cap on the export size so we don't OOM Hermes by reading a huge blob
 * into memory before base64-encoding it.
 */
const MAX_EXPORT_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Convert a fetched Blob to a base64 string. Uses FileReader, which is the
 * most portable approach on React Native (Hermes ships with one).
 */
const _blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("FileReader error"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unexpected FileReader result type"));
        return;
      }
      // result is a `data:<mime>;base64,<payload>` URI — strip the prefix.
      const commaIdx = result.indexOf(",");
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.readAsDataURL(blob);
  });

/** Strip the trailing extension — SAF.createFileAsync wants the name without it. */
const _stripExt = (filename) => {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(0, dot) : filename;
};

/**
 * Resolve a Storage Access Framework directory grant (Android). Returns the
 * directory URI, or null if the user declined. When `forceNew` is true a fresh
 * grant is requested (used when a persisted grant has gone stale).
 */
const _resolveAndroidDir = async (forceNew = false) => {
  if (!forceNew) {
    const saved = await AsyncStorage.getItem(SAF_DIR_KEY);
    if (saved) return saved;
  }
  const perm =
    await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!perm?.granted || !perm?.directoryUri) return null;
  await AsyncStorage.setItem(SAF_DIR_KEY, perm.directoryUri);
  return perm.directoryUri;
};

/**
 * Save base64 content directly into the user's chosen folder via SAF.
 * @returns {Promise<{ ok: boolean, fileUri?: string, denied?: boolean, error?: Error }>}
 */
const _saveToAndroidFolder = async (base64, filename, mimeType) => {
  const baseName = _stripExt(filename);
  const writeInto = async (dirUri) => {
    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
      dirUri,
      baseName,
      mimeType,
    );
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return fileUri;
  };

  let dirUri = await _resolveAndroidDir(false);
  if (!dirUri) return { ok: false, denied: true };

  try {
    return { ok: true, fileUri: await writeInto(dirUri) };
  } catch (_firstErr) {
    // A persisted grant can be revoked/invalid — re-request once and retry.
    await AsyncStorage.removeItem(SAF_DIR_KEY);
    const fresh = await _resolveAndroidDir(true);
    if (!fresh) return { ok: false, denied: true };
    try {
      return { ok: true, fileUri: await writeInto(fresh) };
    } catch (error) {
      return { ok: false, error };
    }
  }
};

/**
 * Write the file to cache and open the native share/"Save to Files" sheet.
 * Used on iOS, and as the Android fallback when the user declines folder access.
 */
const _saveViaShareSheet = async (base64, filename, mimeType, UTI, dialogTitle) => {
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    return {
      success: true,
      message: "تم حفظ الملف. الحفظ المباشر غير متاح على هذا الجهاز.",
      fileUri,
    };
  }

  try {
    await Sharing.shareAsync(fileUri, { mimeType, dialogTitle, UTI });
    return { success: true, message: null, fileUri };
  } catch (shareErr) {
    // iOS surfaces a user-cancel as a thrown Error — treat as success-canceled
    // so callers don't show a scary error toast for an explicit dismissal.
    const message = String(shareErr?.message || "");
    if (/cancel|dismiss/i.test(message)) {
      return { success: true, message: null, fileUri, canceled: true };
    }
    throw shareErr;
  }
};

/**
 * Save already-encoded base64 content to the user's device. Shared core for
 * both blob downloads and client-side generated files (e.g. XLSX templates).
 *
 * @param {string} base64 - base64 payload (no data: prefix)
 * @param {string} filename - filename including extension (e.g. "events.xlsx")
 * @param {Object} [opts] - { mimeType, dialogTitle, UTI }
 * @returns {Promise<{ success, message, savedTo?, fileUri?, canceled? }>}
 */
export const saveBase64ToDevice = async (base64, filename, opts = {}) => {
  const {
    mimeType = XLSX_MIME,
    dialogTitle = "حفظ الملف",
    UTI = "com.microsoft.excel.xlsx",
  } = opts;

  try {
    if (Platform.OS === "android") {
      const res = await _saveToAndroidFolder(base64, filename, mimeType);
      if (res.ok) {
        ToastAndroid.show("تم حفظ الملف في الجهاز", ToastAndroid.LONG);
        return {
          success: true,
          message: "تم حفظ الملف في الجهاز",
          savedTo: "device",
          fileUri: res.fileUri,
        };
      }
      if (res.denied) {
        // User declined folder access — fall back to the share sheet so they
        // can still get the file ("Save to Files" / send elsewhere).
        return _saveViaShareSheet(base64, filename, mimeType, UTI, dialogTitle);
      }
      throw res.error || new Error("تعذر حفظ الملف");
    }

    // iOS (and web / other): "Save to Files" via the system sheet.
    return _saveViaShareSheet(base64, filename, mimeType, UTI, dialogTitle);
  } catch (error) {
    console.error("[download] saveBase64ToDevice failed:", error);
    return {
      success: false,
      message: error?.message || "حدث خطأ أثناء حفظ الملف",
    };
  }
};

/**
 * Save a Blob to the user's device (download on Android, "Save to Files" on iOS).
 *
 * @param {Blob} blob
 * @param {string} filename - filename including extension (e.g. "events.xlsx")
 * @param {Object} [opts] - { mimeType, dialogTitle, UTI }
 * @returns {Promise<{ success, message, savedTo?, fileUri?, canceled? }>}
 */
export const saveBlobToDevice = async (blob, filename, opts = {}) => {
  if (!blob) return { success: false, message: "لا توجد بيانات للحفظ" };
  if (typeof blob.size === "number" && blob.size > MAX_EXPORT_SIZE_BYTES) {
    return {
      success: false,
      message: `الملف أكبر من الحد المسموح للتصدير (${Math.round(
        MAX_EXPORT_SIZE_BYTES / (1024 * 1024),
      )} ميجابايت).`,
    };
  }
  try {
    const base64 = await _blobToBase64(blob);
    return saveBase64ToDevice(base64, filename, opts);
  } catch (error) {
    console.error("[download] saveBlobToDevice failed:", error);
    return {
      success: false,
      message: error?.message || "حدث خطأ أثناء حفظ الملف",
    };
  }
};

// Back-compat alias — existing imports of `saveBlobAndShare` keep working.
export const saveBlobAndShare = saveBlobToDevice;

export default { saveBlobToDevice, saveBase64ToDevice, saveBlobAndShare };
