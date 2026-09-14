/**
 * VPS-local upload service.
 *
 * Every upload is written below UPLOAD_PATH. Production must mount that path
 * to durable VPS storage and include it in backups.
 */

const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const {
  getLocalUploadRoot,
  localRefFromAbsolutePath,
  localRefForKey,
  normalizeObjectKey,
  deleteLocalObject,
  copyLocalObject,
} = require("./localStorage");

const generateFilename = (file) => {
  const suffix = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
  const extension = path.extname(file.originalname).toLowerCase();
  const baseName = path
    .basename(file.originalname, extension)
    .replace(/[^a-zA-Z0-9]/g, "-")
    .substring(0, 50);
  return `${baseName}-${suffix}${extension}`;
};

const getFolderForField = (fieldname, req) => {
  const userId = req.user?.id || req.user?._id || "temp";
  const eventId = req.params?.eventId || req.params?.id || "new";
  const vendorId = req.user?.role === "vendor" ? userId : "temp";
  const mappings = {
    templateImage: `events/templates/${eventId}`,
    businessLogo: `vendors/logos/${vendorId}`,
    portfolioImages: `vendors/portfolios/${vendorId}`,
    pricePackages: `vendors/packages/${vendorId}`,
    commercialRecordImage: `vendors/documents/${vendorId}`,
    nationalIdImage: `vendors/documents/${vendorId}`,
    cv: `vendors/documents/${vendorId}`,
    profileFile: `vendors/documents/${vendorId}`,
    image: `vendors/services/${vendorId}`,
    avatar: `users/avatars/${userId}`,
    photos: `events/post-event/${eventId}/photos`,
    video: `events/post-event/${eventId}/videos`,
    images: `events/post-event/${eventId}/comments`,
    ticketAttachment: `tickets/${userId}`,
  };
  return mappings[fieldname] || "temp";
};

const createLocalStorage = (uploadsDir = getLocalUploadRoot()) => {
  fs.mkdirSync(uploadsDir, { recursive: true });
  return multer.diskStorage({
    destination: (req, file, callback) => {
      const folder = getFolderForField(file.fieldname, req);
      const uploadPath = path.resolve(uploadsDir, ...folder.split("/"));
      const relative = path.relative(uploadsDir, uploadPath);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        callback(new Error("Invalid local upload destination"));
        return;
      }
      fs.mkdirSync(uploadPath, { recursive: true });
      callback(null, uploadPath);
    },
    filename: (_req, file, callback) => callback(null, generateFilename(file)),
  });
};

const localStorage = createLocalStorage();

const extractStoredRef = (file) => {
  if (!file) return null;
  if (file.path) return localRefFromAbsolutePath(file.path);
  return localRefForKey(file.filename);
};

const getFileUrl = extractStoredRef;
const getFileUrlResolved = async (file) => extractStoredRef(file);

const processUploadedFiles = (files) => {
  const processed = {};
  if (!files) return processed;
  const multipleFields = new Set(["portfolioImages", "pricePackages", "photos", "images"]);
  for (const [fieldName, values] of Object.entries(files)) {
    if (!Array.isArray(values) || values.length === 0) continue;
    processed[fieldName] = multipleFields.has(fieldName)
      ? values.map(extractStoredRef).filter(Boolean)
      : extractStoredRef(values[0]);
  }
  return processed;
};

/** Resolve stored local references for API clients. External URLs remain untouched. */
const resolveStoredImage = async (stored) => {
  if (!stored || typeof stored !== "string") return stored ?? null;
  const value = stored.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return localRefForKey(value);
};

const resolveStoredImages = async (refs) => {
  if (!Array.isArray(refs)) return [];
  return Promise.all(refs.map(resolveStoredImage));
};

/** Return an owned local reference suitable for deletion, never an external URL. */
const resolveOwnedUploadRef = (stored) => {
  if (!stored || typeof stored !== "string" || /^https?:\/\//i.test(stored.trim())) return null;
  return normalizeObjectKey(stored);
};

const deleteStoredFile = async (refOrKey) => {
  if (!resolveOwnedUploadRef(refOrKey)) return false;
  try {
    return await deleteLocalObject(refOrKey);
  } catch (error) {
    console.error("Error deleting local upload:", error);
    return false;
  }
};

const copyStoredFile = async (sourceRefOrKey, destinationKey) => {
  if (!sourceRefOrKey || !destinationKey) return null;
  return copyLocalObject(sourceRefOrKey, destinationKey);
};

const deleteFile = deleteStoredFile;

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const VIDEO_EXTS = [".mp4", ".mov", ".m4v", ".webm", ".3gp"];
const DOC_EXTS = [".pdf", ".doc", ".docx", ".xls", ".xlsx"];
const extOf = (name = "") => String(name).toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || "";
const extAllowed = (name, extensions) => extensions.includes(extOf(name));

const imageFilter = (_req, file, callback) => {
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  callback(
    allowed.includes(file.mimetype) && extAllowed(file.originalname, IMAGE_EXTS)
      ? null
      : new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"),
    allowed.includes(file.mimetype) && extAllowed(file.originalname, IMAGE_EXTS),
  );
};

const mediaFilter = (_req, file, callback) => {
  const allowed =
    (file.mimetype.startsWith("image/") && extAllowed(file.originalname, IMAGE_EXTS)) ||
    (file.mimetype.startsWith("video/") && extAllowed(file.originalname, VIDEO_EXTS));
  callback(allowed ? null : new Error("Only image and video files are allowed"), allowed);
};

const documentFilter = (_req, file, callback) => {
  const allowedTypes = [
    "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  const allowed = allowedTypes.includes(file.mimetype) &&
    extAllowed(file.originalname, [...IMAGE_EXTS, ".pdf", ".doc", ".docx"]);
  callback(allowed ? null : new Error("Only images and documents are allowed"), allowed);
};

const generalFilter = (_req, file, callback) => {
  const allowedTypes = [
    "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  const allowed = allowedTypes.includes(file.mimetype) &&
    extAllowed(file.originalname, [...IMAGE_EXTS, ...DOC_EXTS]);
  callback(
    allowed ? null : new Error("File type not allowed. Only images, PDFs, and documents are accepted."),
    allowed,
  );
};

const vendorSignupFilter = (_req, file, callback) => {
  const field = file.fieldname;
  const mime = file.mimetype;
  const extension = path.extname(file.originalname || "").toLowerCase();
  const expected = {
    ".jpg": ["image/jpeg", "image/jpg"],
    ".jpeg": ["image/jpeg", "image/jpg"],
    ".png": ["image/png"],
    ".webp": ["image/webp"],
    ".pdf": ["application/pdf"],
    ".doc": ["application/msword"],
    ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  };
  const exactType = Boolean(expected[extension]?.includes(mime));
  const imageFields = new Set(["businessLogo", "portfolioImages"]);
  const mixedFields = new Set(["pricePackages", "commercialRecordImage", "nationalIdImage"]);
  const allowed = imageFields.has(field)
    ? exactType && [".jpg", ".jpeg", ".png", ".webp"].includes(extension)
    : mixedFields.has(field)
      ? exactType && [".jpg", ".jpeg", ".png", ".pdf"].includes(extension)
      : field === "profileFile"
        ? exactType && [".pdf", ".doc", ".docx"].includes(extension)
        : false;
  if (allowed) return callback(null, true);
  const error = new Error(`Invalid file type for field "${field}"`);
  error.code = imageFields.has(field) || mixedFields.has(field) || field === "profileFile"
    ? "INVALID_FILE_TYPE"
    : "LIMIT_UNEXPECTED_FILE";
  error.field = field;
  return callback(error, false);
};

const cleanupUploadedFiles = async (files) => {
  if (!files || typeof files !== "object") return;
  const list = Array.isArray(files) ? files : Object.values(files).flat();
  const results = await Promise.allSettled(
    list.filter(Boolean).map((file) => deleteStoredFile(extractStoredRef(file))),
  );
  const failures = results.filter((result) => result.status === "rejected" || result.value === false);
  if (failures.length) {
    const error = new Error(`Failed to clean up ${failures.length} uploaded file(s)`);
    error.code = "UPLOAD_CLEANUP_FAILED";
    error.failures = failures;
    throw error;
  }
};

const scanUploadHook = async ({ buffer, declaredMime } = {}) => {
  if (!Buffer.isBuffer(buffer)) return { clean: true };
  const { scanBuffer } = require("./uploadScan");
  return scanBuffer(buffer, { declaredMime });
};

const uploadImage = multer({ storage: localStorage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadInvitationImage = multer({ storage: localStorage, fileFilter: imageFilter, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadMedia = multer({ storage: localStorage, fileFilter: mediaFilter, limits: { fileSize: 50 * 1024 * 1024 } });
const uploadDocument = multer({ storage: localStorage, fileFilter: documentFilter, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadGeneral = multer({ storage: localStorage, fileFilter: generalFilter, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadVendor = multer({ storage: localStorage, fileFilter: vendorSignupFilter, limits: { fileSize: 10 * 1024 * 1024 } });

const uploadVendorFiles = uploadVendor.fields([
  { name: "portfolioImages", maxCount: 10 }, { name: "businessLogo", maxCount: 1 },
  { name: "pricePackages", maxCount: 5 }, { name: "commercialRecordImage", maxCount: 1 },
  { name: "nationalIdImage", maxCount: 1 }, { name: "profileFile", maxCount: 1 },
]);
const uploadUserProfile = uploadGeneral.fields([
  { name: "businessLogo", maxCount: 1 }, { name: "avatar", maxCount: 1 },
  { name: "nationalIdImage", maxCount: 1 }, { name: "commercialRecordImage", maxCount: 1 },
  { name: "portfolioImages", maxCount: 10 }, { name: "pricePackages", maxCount: 10 },
  { name: "profileFile", maxCount: 1 },
]);
const uploadPostEventMedia = uploadMedia.fields([
  { name: "photos", maxCount: 20 }, { name: "video", maxCount: 1 }, { name: "images", maxCount: 10 },
]);

module.exports = {
  localStorage,
  createLocalStorage,
  generateFilename,
  getFolderForField,
  getFileUrl,
  getFileUrlResolved,
  processUploadedFiles,
  extractStoredRef,
  resolveStoredImage,
  resolveStoredImages,
  resolveOwnedUploadRef,
  copyStoredFile,
  deleteStoredFile,
  deleteFile,
  imageFilter,
  mediaFilter,
  documentFilter,
  generalFilter,
  vendorSignupFilter,
  cleanupUploadedFiles,
  scanUploadHook,
  uploadImage,
  uploadMedia,
  uploadDocument,
  uploadGeneral,
  uploadVendorFiles,
  uploadUserProfile,
  uploadPostEventMedia,
  uploadLogo: uploadImage.single("logo"),
  uploadTemplateImage: uploadInvitationImage.single("templateImage"),
  uploadServiceImage: uploadImage.single("image"),
  uploadAvatar: uploadImage.single("avatar"),
  uploadMultipleImages: uploadImage.array("images", 10),
  uploadPortfolio: uploadImage.array("portfolioImages", 20),
};
