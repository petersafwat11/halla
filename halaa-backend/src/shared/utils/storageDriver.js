/**
 * Runtime file-storage driver.
 *
 * S3 remains available for rollback/migration, but production may explicitly
 * select durable VPS storage with FILE_STORAGE_DRIVER=local. Local objects are
 * stored under UPLOAD_PATH (a Docker bind mount in production) and exposed as
 * stable /uploads/... references.
 */

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const PUBLIC_PREFIX = "/uploads/";

const getStorageDriver = () =>
  String(process.env.FILE_STORAGE_DRIVER || "s3").trim().toLowerCase();

const isLocalStorage = () => getStorageDriver() === "local";

const assertStorageDriver = () => {
  const driver = getStorageDriver();
  if (!new Set(["s3", "local"]).has(driver)) {
    throw new Error(
      `Unsupported FILE_STORAGE_DRIVER=${driver}; expected "s3" or "local"`
    );
  }
  return driver;
};

const getLocalUploadRoot = () => {
  const configured = process.env.UPLOAD_PATH || "./public/uploads";
  return path.resolve(PROJECT_ROOT, configured);
};

const normalizeObjectKey = (value) => {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\\/g, "/");
  if (!trimmed || /^https?:/i.test(trimmed)) return null;
  const withoutPrefix = trimmed.startsWith(PUBLIC_PREFIX)
    ? trimmed.slice(PUBLIC_PREFIX.length)
    : trimmed.replace(/^uploads\//, "").replace(/^\/+/, "");
  const normalized = path.posix.normalize(withoutPrefix);
  if (
    !normalized ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    path.posix.isAbsolute(normalized)
  ) {
    return null;
  }
  return normalized;
};

const localRefForKey = (key) => {
  const normalized = normalizeObjectKey(key);
  if (!normalized) return null;
  return `${PUBLIC_PREFIX}${normalized}`;
};

const resolveLocalPath = (refOrKey) => {
  const key = normalizeObjectKey(refOrKey);
  if (!key) return null;
  const root = getLocalUploadRoot();
  const target = path.resolve(root, ...key.split("/"));
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return target;
};

const localRefFromAbsolutePath = (absolutePath) => {
  if (!absolutePath) return null;
  const root = getLocalUploadRoot();
  const target = path.resolve(absolutePath);
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return localRefForKey(relative.split(path.sep).join("/"));
};

const ensureLocalUploadRoot = async () => {
  const root = getLocalUploadRoot();
  await fs.promises.mkdir(root, { recursive: true });
  return root;
};

const writeLocalObject = async ({ key, body }) => {
  const target = resolveLocalPath(key);
  if (!target) throw new Error("Invalid local storage key");
  await fs.promises.mkdir(path.dirname(target), { recursive: true });
  await fs.promises.writeFile(target, body);
  return localRefForKey(key);
};

const readLocalObject = async (refOrKey) => {
  const target = resolveLocalPath(refOrKey);
  if (!target) {
    const err = new Error("Invalid local storage reference");
    err.code = "ENOENT";
    throw err;
  }
  return fs.promises.readFile(target);
};

const deleteLocalObject = async (refOrKey) => {
  const target = resolveLocalPath(refOrKey);
  if (!target) return false;
  try {
    await fs.promises.unlink(target);
    return true;
  } catch (err) {
    if (err.code === "ENOENT") return true;
    throw err;
  }
};

const copyLocalObject = async (sourceRefOrKey, destinationKey) => {
  const source = resolveLocalPath(sourceRefOrKey);
  const destination = resolveLocalPath(destinationKey);
  if (!source || !destination) return null;
  await fs.promises.mkdir(path.dirname(destination), { recursive: true });
  await fs.promises.copyFile(source, destination);
  return localRefForKey(destinationKey);
};

const contentTypeForRef = (ref = "") => {
  const extension = path.extname(String(ref).split("?")[0]).toLowerCase();
  return {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".pdf": "application/pdf",
  }[extension] || "application/octet-stream";
};

module.exports = {
  PUBLIC_PREFIX,
  getStorageDriver,
  isLocalStorage,
  assertStorageDriver,
  getLocalUploadRoot,
  normalizeObjectKey,
  localRefForKey,
  resolveLocalPath,
  localRefFromAbsolutePath,
  ensureLocalUploadRoot,
  writeLocalObject,
  readLocalObject,
  deleteLocalObject,
  copyLocalObject,
  contentTypeForRef,
};
