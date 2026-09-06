/**
 * React Native File Normalizer and Validator
 */

const EXT_TO_MIME = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_DOCUMENT_MIMES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_MIXED_MIMES = ["image/jpeg", "image/png", "application/pdf"];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Normalizes a React Native asset (from ImagePicker or DocumentPicker)
 * into a canonical { uri, name, type } object for FormData.
 *
 * @param {Object} file - Raw asset object
 * @param {'image'|'document'|'mixed'} fieldKind - Target field type
 * @returns {{ uri: string, name: string, type: string }}
 */
export const normalizeRNFile = (file, fieldKind = "image") => {
  if (!file) return null;

  const uri = file.uri || file.path;
  if (!uri || typeof uri !== "string") {
    throw new Error("Invalid file asset: missing URI");
  }

  // Derive file name: fileName -> name -> URI basename
  let name = file.fileName || file.name;
  if (!name) {
    const rawName = uri.split("/").pop();
    name = rawName ? rawName.split("?")[0] : `file_${Date.now()}`;
  }

  // Reject SVG specifically
  if (name.toLowerCase().endsWith(".svg") || file.mimeType === "image/svg+xml") {
    throw new Error("SVG files are not supported");
  }

  // Extract extension
  const ext = name.includes(".") ? name.split(".").pop().toLowerCase() : "";

  // Derive MIME type
  let mime = null;
  if (file.mimeType && typeof file.mimeType === "string" && file.mimeType.includes("/")) {
    mime = file.mimeType.toLowerCase();
  } else if (file.type && typeof file.type === "string" && file.type.includes("/")) {
    mime = file.type.toLowerCase();
  } else if (ext && EXT_TO_MIME[ext]) {
    mime = EXT_TO_MIME[ext];
  }

  // Enforce field kind validation
  const isImageMime = mime && ALLOWED_IMAGE_MIMES.includes(mime);
  const isDocMime = mime && ALLOWED_DOCUMENT_MIMES.includes(mime);
  const isMixedMime = mime && ALLOWED_MIXED_MIMES.includes(mime);
  const expectedMime = EXT_TO_MIME[ext];

  if (!expectedMime || (mime && mime !== expectedMime)) {
    throw new Error(`File extension and MIME type do not match for ${name}`);
  }

  if (fieldKind === "image") {
    if (!isImageMime) {
      throw new Error(`Unsupported image type for ${name}. Allowed: JPG, PNG, WebP`);
    }
  } else if (fieldKind === "document") {
    if (!isDocMime) {
      throw new Error(`Unsupported document type for ${name}. Allowed: PDF, DOC, DOCX`);
    }
  } else if (fieldKind === "mixed") {
    if (!isMixedMime) {
      throw new Error(`Unsupported file type for ${name}. Allowed: PDF, JPG, or PNG`);
    }
  }

  // Size check if size is available
  // Expo ImagePicker reports fileSize; DocumentPicker reports size.
  const size = file.size ?? file.fileSize;
  if (size && size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size for ${name} exceeds the 10 MB limit`);
  }

  return {
    uri,
    name,
    type: mime,
    ...(size !== undefined ? { size } : {}),
  };
};
