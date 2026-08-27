import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";

// Keep upload output comfortably below the backend's 10 MB Multer limit.
export const INVITATION_UPLOAD_TARGET_BYTES = 9 * 1024 * 1024;
export const INVITATION_MAX_DIMENSION = 2048;

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
  const info = await FileSystem.getInfoAsync(uri, { size: true });
  return info.exists && typeof info.size === "number" ? info.size : null;
};

/**
 * Normalize picked or baked invitation artwork to a bounded JPEG.
 * This removes the difference between huge lossless template captures and
 * camera/gallery uploads before either reaches the multipart boundary.
 */
export async function normalizeInvitationImage(image) {
  if (!image?.uri) throw new Error("INVITATION_IMAGE_MISSING");

  let source = image;
  for (const pass of PASSES) {
    const result = await manipulateAsync(
      source.uri,
      resizeAction(source.width, source.height, pass.maxDimension),
      { compress: pass.quality, format: SaveFormat.JPEG }
    );
    const size = await fileSize(result.uri);
    source = result;
    if (size == null || size <= INVITATION_UPLOAD_TARGET_BYTES) {
      const name = `invitation-${Date.now()}.jpg`;
      return {
        uri: result.uri,
        width: result.width,
        height: result.height,
        size,
        name,
        fileName: name,
        type: "image/jpeg",
      };
    }
  }

  throw new Error("INVITATION_IMAGE_TOO_LARGE_AFTER_COMPRESSION");
}

