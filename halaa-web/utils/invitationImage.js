export const INVITATION_UPLOAD_TARGET_BYTES = 9 * 1024 * 1024;
export const INVITATION_MAX_DIMENSION = 2048;

const PASSES = [
  { maxDimension: INVITATION_MAX_DIMENSION, quality: 0.88 },
  { maxDimension: 1600, quality: 0.76 },
  { maxDimension: 1280, quality: 0.64 },
];

const canvasToBlob = (canvas, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("INVITATION_IMAGE_ENCODE_FAILED")),
      "image/jpeg",
      quality
    );
  });

const loadBitmap = async (file) => {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("INVITATION_IMAGE_DECODE_FAILED"));
      element.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
};

/** Downscale and encode any supported browser image into a bounded JPEG. */
export async function normalizeInvitationImageFile(file) {
  if (!(file instanceof Blob)) throw new Error("INVITATION_IMAGE_MISSING");
  const bitmap = await loadBitmap(file);
  const sourceWidth = bitmap.width || bitmap.naturalWidth;
  const sourceHeight = bitmap.height || bitmap.naturalHeight;

  try {
    for (const pass of PASSES) {
      const scale = Math.min(
        1,
        pass.maxDimension / Math.max(sourceWidth, sourceHeight)
      );
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("INVITATION_IMAGE_CANVAS_UNAVAILABLE");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);

      const blob = await canvasToBlob(canvas, pass.quality);
      canvas.width = 1;
      canvas.height = 1;
      if (blob.size <= INVITATION_UPLOAD_TARGET_BYTES) {
        const baseName = String(file.name || "invitation").replace(/\.[^.]+$/, "");
        return new File([blob], `${baseName}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
      }
    }
  } finally {
    bitmap.close?.();
  }

  throw new Error("INVITATION_IMAGE_TOO_LARGE_AFTER_COMPRESSION");
}

