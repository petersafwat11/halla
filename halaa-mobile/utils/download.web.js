const MAX_SIZE = 50 * 1024 * 1024;

export const saveBlobToDevice = async (blob, filename) => {
  if (!blob || blob.size > MAX_SIZE) return { success: false, message: "Invalid export size" };
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return { success: true, savedTo: "browser" };
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
};
export const saveBase64ToDevice = async (base64, filename, opts = {}) => {
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  return saveBlobToDevice(new Blob([bytes], { type: opts.mimeType || "application/octet-stream" }), filename);
};
export const saveBlobAndShare = saveBlobToDevice;
export default { saveBlobToDevice, saveBase64ToDevice, saveBlobAndShare };
