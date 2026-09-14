import { Platform } from "react-native";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { UPLOAD_LIMITS } from "@halaa/shared/constants";
import { canSkipInvitationReencode } from "@halaa/shared/utils/invitationImagePlan";

// Keep upload output comfortably below the backend's 10 MB Multer limit.
export const INVITATION_UPLOAD_TARGET_BYTES = UPLOAD_LIMITS.CLIENT_INVITATION_TARGET_BYTES;
export const INVITATION_MAX_DIMENSION = UPLOAD_LIMITS.INVITATION_MAX_DIMENSION;

const PASSES = [
  { maxDimension: INVITATION_MAX_DIMENSION, quality: 0.86 },
  { maxDimension: 1600, quality: 0.74 },
  { maxDimension: 1280, quality: 0.62 },
];

const resizeAction = (width, height, maxDimension) => {
  if (!width || !height || Math.max(width, height) <= maxDimension) return [];
  return width >= height
    ? [{ resize: { width: maxDimension } }]
    : [{ resize: { height: maxDimension } }];
};

const fileSize = async (uri) => {
  if (Platform.OS === "web") return (await (await fetch(uri)).blob()).size;
  const info = await FileSystem.getInfoAsync(uri, { size: true });
  return info.exists && typeof info.size === "number" ? info.size : null;
};

const discardTempFile = (uri) => {
  if (!uri || Platform.OS === "web") return;
  FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
};

const toUploadFile = ({ uri, width, height, size }) => {
  const name = `invitation-${Date.now()}.jpg`;
  return {
    uri,
    width,
    height,
    size,
    name,
    fileName: name,
    type: "image/jpeg",
  };
};

/**
 * Normalize picked or baked invitation artwork to a bounded JPEG.
 *
 * - `skipIfBounded` (template captures only): a JPEG already within the
 *   dimension and byte limits is used as-is. Gallery picks never skip, so
 *   ImageManipulator still applies their EXIF orientation.
 * - Otherwise each pass re-encodes the original once and stops at the first
 *   pass that fits; rejected pass outputs are deleted.
 * - `ownsSource`: the source is an app temp file that may be deleted once a
 *   replacement file exists.
 */
export async function normalizeInvitationImage(image) {
  if (!image?.uri) throw new Error("INVITATION_IMAGE_MISSING");

  if (image.skipIfBounded) {
    const sourceSize = await fileSize(image.uri).catch(() => null);
    if (
      canSkipInvitationReencode({
        type: image.type,
        width: image.width,
        height: image.height,
        bytes: sourceSize,
      })
    ) {
      return toUploadFile({
        uri: image.uri,
        width: image.width,
        height: image.height,
        size: sourceSize,
      });
    }
  }

  for (const pass of PASSES) {
    const result = await manipulateAsync(
      image.uri,
      resizeAction(image.width, image.height, pass.maxDimension),
      { compress: pass.quality, format: SaveFormat.JPEG }
    );
    const size = await fileSize(result.uri);
    if (size == null || size <= INVITATION_UPLOAD_TARGET_BYTES) {
      if (image.ownsSource) discardTempFile(image.uri);
      return toUploadFile({
        uri: result.uri,
        width: result.width,
        height: result.height,
        size,
      });
    }
    discardTempFile(result.uri);
  }

  if (image.ownsSource) discardTempFile(image.uri);
  const err = new Error("INVITATION_IMAGE_TOO_LARGE_AFTER_COMPRESSION");
  err.code = "EVENT_IMAGE_TOO_LARGE";
  throw err;
}
