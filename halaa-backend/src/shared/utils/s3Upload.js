/**
 * S3 Upload Utility for New Backend
 * Centralized AWS S3 file upload service with multer-s3 integration
 * @module shared/utils/s3Upload
 */

const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");

// `@aws-sdk/lib-storage` provides streaming multipart upload for buffers /
// streams larger than the 5 MB single-part threshold. Loaded lazily so the
// module still works in dev environments where the dependency is missing.
let LibStorageUpload = null;
try {
  LibStorageUpload = require("@aws-sdk/lib-storage").Upload;
} catch (_e) {
  LibStorageUpload = null;
}

// Check if S3 is configured
const isS3Configured = () => {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION &&
    process.env.AWS_S3_BUCKET
  );
};

// Initialize S3 client (only if configured)
let s3Client = null;
if (isS3Configured()) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Generate unique filename with original extension
 * @param {Object} file - Multer file object
 * @returns {string} Unique filename
 */
const generateFilename = (file) => {
  const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
  const extension = path.extname(file.originalname).toLowerCase();
  const baseName = path
    .basename(file.originalname, extension)
    .replace(/[^a-zA-Z0-9]/g, "-")
    .substring(0, 50);
  return `${baseName}-${uniqueSuffix}${extension}`;
};

/**
 * Get S3 folder path based on field name and request context
 * @param {string} fieldname - Form field name
 * @param {Object} req - Express request object
 * @returns {string} S3 folder path
 */
const getFolderForField = (fieldname, req) => {
  const userId = req.user?.id || req.user?._id || "temp";
  const eventId = req.params?.eventId || req.params?.id || "new";
  const vendorId = req.user?.role === "vendor" ? userId : "temp";

  const mappings = {
    // Event templates
    templateImage: `events/templates/${eventId}`,

    // Vendor files
    businessLogo: `vendors/logos/${vendorId}`,
    portfolioImages: `vendors/portfolios/${vendorId}`,
    pricePackages: `vendors/packages/${vendorId}`,
    commercialRecordImage: `vendors/documents/${vendorId}`,
    nationalIdImage: `vendors/documents/${vendorId}`,
    cv: `vendors/documents/${vendorId}`,
    profileFile: `vendors/documents/${vendorId}`,
    image: `vendors/services/${vendorId}`,

    // User files
    avatar: `users/avatars/${userId}`,

    // Post-event content
    photos: `events/post-event/${eventId}/photos`,
    video: `events/post-event/${eventId}/videos`,
    images: `events/post-event/${eventId}/comments`,
  };

  return mappings[fieldname] || "temp";
};

/**
 * Create local disk storage (fallback)
 * @param {string} baseDir - Base upload directory
 * @returns {Object} Multer disk storage
 */
const createLocalStorage = (baseDir) => {
  const uploadsDir = path.join(baseDir, "public/uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  return multer.diskStorage({
    destination: (req, file, cb) => {
      let uploadPath = uploadsDir;

      const folderMap = {
        logo: "logos",
        businessLogo: "logos",
        portfolioImages: "portfolios",
        pricePackages: "packages",
        commercialRecordImage: "documents",
        nationalIdImage: "documents",
        cv: "documents",
        profileFile: "documents",
        templateImage: "templates",
        avatar: "avatars",
        image: "services",
        photos: "post-event",
        video: "post-event",
        images: "post-event",
      };

      const folder = folderMap[file.fieldname] || "general";
      uploadPath = path.join(uploadsDir, folder);

      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      cb(null, generateFilename(file));
    },
  });
};

/**
 * Create multer-S3 storage configuration.
 *
 * S3 must fail closed: a silent local-disk fallback on missing credentials
 * produces "uploaded" files that disappear on the next deploy. We raise at
 * boot if S3 isn't configured **in production**. In development we still
 * allow a local-disk storage so contributors can run the server without AWS
 * keys, but the fallback is opt-in via `ALLOW_LOCAL_UPLOADS` and is logged
 * loudly. There is no per-request S3-error → local fallback — multer-s3
 * errors propagate to the caller.
 *
 * @returns {Object} Multer storage configuration
 */
const createS3Storage = () => {
  if (!isS3Configured() || !s3Client) {
    const allowLocal =
      process.env.NODE_ENV !== "production" &&
      process.env.ALLOW_LOCAL_UPLOADS === "true";

    if (!allowLocal) {
      throw new Error(
        "S3 is not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, " +
          "AWS_REGION, AWS_S3_BUCKET (and AWS_S3_BASE_URL). To run locally " +
          "without AWS, set ALLOW_LOCAL_UPLOADS=true (development only)."
      );
    }

    console.warn(
      "[s3Upload] WARNING: S3 not configured. Using LOCAL disk storage. " +
        "This is dev-only — uploaded files will not persist across deploys."
    );
    return createLocalStorage(path.join(__dirname, "../../.."));
  }

  return multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET,
    // bucket is private. Force the ACL on every PutObject so a
    // misconfigured bucket policy can't accidentally publish uploads. Reads
    // go through `getSignedUrlForKey` / `getFileUrl`.
    acl: "private",
    // AUTO_CONTENT_TYPE sniffs magic bytes from the upload stream, so
    // the stored S3 Content-Type may differ from what the multer file
    // filter saw declared. The `fileFilter` already validates the declared
    // MIME for routing/limits; consumers that read the object back must
    // trust the stored Content-Type returned by S3, not the declared MIME.
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, {
        fieldName: file.fieldname,
        originalName: file.originalname,
        uploadedBy: req.user?.id || "anonymous",
        uploadedAt: new Date().toISOString(),
      });
    },
    key: (req, file, cb) => {
      const folder = getFolderForField(file.fieldname, req);
      const filename = generateFilename(file);
      cb(null, `${folder}/${filename}`);
    },
  });
};

// Anything larger than this goes through `@aws-sdk/lib-storage`'s
// multipart Upload helper so we don't hold the entire buffer in memory.
// 5 MiB is also the S3 minimum part size.
const STREAMING_PART_SIZE = 5 * 1024 * 1024;

/**
 * Upload a single file to S3 programmatically.
 *
 * Always uploads with `ACL: 'private'`. The returned `url` is a
 * **signed** GET URL with a 1-hour TTL — never a public bucket URL.
 * Persist the `key` and call `getSignedUrlForKey(key)` at read time to
 * mint a fresh URL.
 *
 * For buffers/streams larger than 5 MiB we use the lib-storage
 * `Upload` helper, which performs streaming multipart uploads instead of
 * holding the entire body in memory.
 *
 * @param {Buffer|Stream} fileBuffer - File content
 * @param {string} folder - S3 folder path
 * @param {string} filename - Original filename
 * @param {string} contentType - File MIME type
 * @returns {Promise<Object>} Upload result with signed URL and key
 */
const uploadToS3 = async (fileBuffer, folder, filename, contentType) => {
  if (!isS3Configured() || !s3Client) {
    throw new Error("S3 is not configured");
  }

  const key = `${folder}/${generateFilename({ originalname: filename })}`;

  const isBuffer = Buffer.isBuffer(fileBuffer);
  const isStream =
    fileBuffer && typeof fileBuffer.pipe === "function";
  const sizeHint = isBuffer ? fileBuffer.length : null;
  const useStreaming =
    LibStorageUpload && (isStream || (isBuffer && sizeHint > STREAMING_PART_SIZE));

  if (useStreaming) {
    const uploader = new LibStorageUpload({
      client: s3Client,
      params: {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: fileBuffer,
        ACL: "private",
        ContentType: contentType,
      },
      queueSize: 4,
      partSize: STREAMING_PART_SIZE,
      leavePartsOnError: false,
    });
    await uploader.done();
  } else {
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: fileBuffer,
      ACL: "private",
      ContentType: contentType,
    });
    await s3Client.send(command);
  }

  // Return a signed URL — the bucket is private, so a public URL would 403.
  const url = await getSignedUrlForKey(key);

  return {
    key,
    url,
    bucket: process.env.AWS_S3_BUCKET,
  };
};

/**
 * Upload multiple files to S3
 * @param {Array} files - Array of file objects with buffer, folder, filename, contentType
 * @returns {Promise<Array>} Array of upload results
 */
const uploadMultipleToS3 = async (files) => {
  if (!isS3Configured() || !s3Client) {
    throw new Error("S3 is not configured");
  }

  const uploadPromises = files.map((file) =>
    uploadToS3(file.buffer, file.folder, file.filename, file.contentType)
  );

  return Promise.all(uploadPromises);
};

/**
 * Delete a file from S3
 * @param {string} key - S3 object key
 * @returns {Promise<boolean>} Success status
 */
const deleteFromS3 = async (key) => {
  if (!isS3Configured() || !s3Client) {
    console.warn("S3 not configured, cannot delete file");
    return false;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error("Error deleting from S3:", error);
    return false;
  }
};

/**
 * Copy an S3 object to a new key (server-side copy). Used to snapshot a
 * business logo into an event-owned immutable key so a later logo swap/delete
 * on the source doesn't break already-issued invitations.
 *
 * @param {string} sourceKey
 * @param {string} destKey
 * @returns {Promise<string|null>} destKey on success, null if not copied.
 */
const copyS3Object = async (sourceKey, destKey) => {
  if (!sourceKey || !destKey) return null;
  if (!isS3Configured() || !s3Client) {
    // Dev/local without S3: fall back to referencing the source key. The
    // immutability guarantee is a no-op locally (no real object to delete).
    return sourceKey;
  }
  try {
    const command = new CopyObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      CopySource: `${process.env.AWS_S3_BUCKET}/${sourceKey}`,
      Key: destKey,
      ACL: "private",
    });
    await s3Client.send(command);
    return destKey;
  } catch (error) {
    console.error("Error copying S3 object:", error);
    return null;
  }
};

/**
 * Delete file by URL (extracts key from URL)
 * @param {string} url - Full S3 URL
 * @returns {Promise<boolean>} Success status
 */
const deleteFromS3ByUrl = async (url) => {
  if (!url || !process.env.AWS_S3_BASE_URL) {
    return false;
  }

  if (!url.includes(process.env.AWS_S3_BUCKET)) {
    return false;
  }

  try {
    const baseUrl = process.env.AWS_S3_BASE_URL;
    const key = url.replace(`${baseUrl}/`, "");
    return await deleteFromS3(key);
  } catch (error) {
    console.error("Error extracting key from URL:", error);
    return false;
  }
};

/**
 * Get a signed URL for temporary access to a private file
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL expiration time in seconds (default: 3600)
 * @returns {Promise<string>} Signed URL
 */
const getSignedUrlForKey = async (key, expiresIn = 3600) => {
  if (!isS3Configured() || !s3Client) {
    throw new Error("S3 is not configured");
  }

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
};

/**
 * Get the full S3 URL for a file
 * @param {string} key - S3 object key
 * @returns {string} Full S3 URL
 */
const getS3Url = (key) => {
  if (!key) return null;
  return `${process.env.AWS_S3_BASE_URL}/${key}`;
};

/**
 * Extract S3 key from full URL
 * @param {string} url - Full S3 URL
 * @returns {string|null} S3 key or null
 */
const getKeyFromUrl = (url) => {
  if (!url || !process.env.AWS_S3_BASE_URL) return null;
  if (!url.startsWith(process.env.AWS_S3_BASE_URL)) return null;
  return url.replace(`${process.env.AWS_S3_BASE_URL}/`, "");
};

/**
 * Check if a URL is an S3 URL
 * @param {string} url - URL to check
 * @returns {boolean} True if S3 URL
 */
const isS3Url = (url) => {
  if (!url || !process.env.AWS_S3_BASE_URL) return false;
  return url.startsWith(process.env.AWS_S3_BASE_URL);
};

/**
 * Get file URL from multer file object.
 *
 * The bucket is **private**, so the constructed public-URL path
 * (`AWS_S3_BASE_URL/<key>`) would return 403 in production. In production
 * we always return a **signed** GET URL with a 1-hour TTL. Consumers must
 * NOT cache the URL forever — they
 * should either persist the `key` and re-mint via `getSignedUrlForKey`,
 * or rely on a short refresh cycle (e.g. Next.js Image with default
 * revalidation). In development the function may still return the
 * configured base-URL path for convenience when the local bucket is
 * public-read.
 *
 * NOTE: this function is now async-capable. Multer middleware paths that
 * synchronously read `file.location` continue to work because multer-s3
 * stamps the bucket URL there directly; for sync callers we return that
 * value, but those callers SHOULD be migrated to use the key + signed-URL
 * pattern. Sync callers that pass only `file.key` get the unsigned URL
 * back (still usable in dev / for callers that will sign themselves).
 *
 * @param {Object} file - Multer file object
 * @returns {string|null} File URL (may be unsigned in dev)
 */
const getFileUrl = (file) => {
  if (!file) return null;

  // S3 upload (multer-s3) — `location` is set by multer-s3 to the bucket
  // URL. With a private bucket this URL is not directly readable, but the
  // value is a useful canonical reference; consumers should pass the key
  // (also on `file.key`) into `getSignedUrlForKey` to read.
  if (file.location) {
    return file.location;
  }

  // S3 key present
  if (file.key) {
    return getS3Url(file.key);
  }

  if (isS3Configured()) {
    // We expected an S3 result and got a local-disk multer file. That means
    // an upstream caller bypassed `s3Storage` — that's a bug, not a fallback.
    throw new Error(
      "S3 is configured but multer returned a local-disk file; check the upload route's storage engine"
    );
  }

  // Local-disk dev mode (ALLOW_LOCAL_UPLOADS=true)
  if (file.path) {
    const publicIndex = file.path.indexOf("public");
    if (publicIndex !== -1) {
      return file.path.substring(publicIndex + 6);
    }
    return file.filename;
  }

  return null;
};

/**
 * Async variant of `getFileUrl` that returns a signed URL when S3 is
 * configured. Prefer this for any read-time URL construction in
 * production code paths.
 *
 * @param {Object} file - Multer file object (or any object with `key`)
 * @param {Object} [opts]
 * @param {number} [opts.expiresIn=3600]
 * @returns {Promise<string|null>}
 */
const getFileUrlSigned = async (file, opts = {}) => {
  if (!file) return null;
  const key = file.key || (file.location ? getKeyFromUrl(file.location) : null);
  if (key && isS3Configured()) {
    return getSignedUrlForKey(key, opts.expiresIn || 3600);
  }
  // Fallback for dev local-disk uploads.
  return getFileUrl(file);
};

/**
 * Extract the canonical stored reference for a multer file.
 *
 * For S3 uploads we persist the **key** (so we can mint short-lived signed
 * URLs at read time — the bucket is private). For local-disk dev uploads we
 * persist the public-relative path so the dev server can serve them
 * directly.
 *
 * @param {Object} file - Multer file object
 * @returns {string|null}
 */
const extractStoredRef = (file) => {
  if (!file) return null;
  if (file.key) return file.key; // multer-s3
  if (file.path) {
    const publicIndex = file.path.indexOf("public");
    if (publicIndex !== -1) {
      return file.path.substring(publicIndex + 6);
    }
    return file.filename;
  }
  return null;
};

/**
 * Process uploaded files and return stored references (S3 keys or local paths).
 * @param {Object} files - Multer files object
 * @returns {Object<string, string|string[]>}
 */
const processUploadedFiles = (files) => {
  const processed = {};

  if (!files) return processed;

  Object.keys(files).forEach((fieldName) => {
    if (files[fieldName] && files[fieldName].length > 0) {
      const multipleFields = [
        "portfolioImages",
        "pricePackages",
        "photos",
        "images",
      ];
      if (multipleFields.includes(fieldName)) {
        processed[fieldName] = files[fieldName].map(extractStoredRef);
      } else {
        processed[fieldName] = extractStoredRef(files[fieldName][0]);
      }
    }
  });

  return processed;
};

/**
 * Convert a stored image reference into a renderable URL.
 *
 * The S3 bucket is served with a public-read bucket policy
 * (`PublicReadGetObject` on `arn:aws:s3:::<bucket>/*`), so objects are
 * fetched directly by their public URL — the same way event / post-event
 * media is served. We deliberately do NOT presign here: the IAM user the
 * backend runs as carries an explicit Deny on `s3:GetObject`, so presigned
 * URLs (authenticated as that user) get a 403 "explicit deny" even though
 * the bucket policy would allow anonymous reads. Returning the plain public
 * URL keeps vendor/service images consistent with event images and avoids
 * that failure mode.
 *
 * - S3 keys → public bucket URL (`AWS_S3_BASE_URL/<key>`)
 * - Our-bucket URLs (incl. stale presigned ones) → normalized to the clean
 *   public URL (query string / signature stripped)
 * - External URLs (CDN, third-party) → returned unchanged
 * - Local-disk dev paths → returned unchanged
 * - null / undefined / non-string → returned as-is
 *
 * Kept `async` so existing `await signStoredImage(...)` call sites are
 * unaffected.
 *
 * @param {string|null|undefined} stored
 * @returns {Promise<string|null>}
 */
const signStoredImage = async (stored) => {
  if (!stored || typeof stored !== "string") return stored ?? null;
  // Local-disk dev path
  if (stored.startsWith("/uploads/") || stored.startsWith("uploads/")) {
    return stored.startsWith("/") ? stored : `/${stored}`;
  }

  // Full URL stored (legacy data, seed data, callers that persisted
  // `file.location`, or a previously-minted presigned URL). If it points at
  // our own bucket, normalize to the clean public URL (this strips any stale
  // `X-Amz-*` query string). Otherwise it's an external URL — pass through.
  if (stored.startsWith("http://") || stored.startsWith("https://")) {
    const extracted = _extractKeyFromOurS3Url(stored);
    if (extracted && process.env.AWS_S3_BASE_URL) {
      return getS3Url(extracted);
    }
    return stored;
  }

  // Bare S3 key → public bucket URL.
  if (process.env.AWS_S3_BASE_URL) {
    return getS3Url(stored);
  }
  return stored;
};

/**
 * Extract the S3 key from a URL that points at our bucket. Returns null if
 * the URL is from a different host.
 *
 * Handles three URL shapes:
 *   - `${AWS_S3_BASE_URL}/<key>` (canonical)
 *   - `https://<bucket>.s3.<region>.amazonaws.com/<key>` (virtual-host)
 *   - `https://s3.<region>.amazonaws.com/<bucket>/<key>` (path-style)
 *
 * @param {string} url
 * @returns {string|null}
 */
const _extractKeyFromOurS3Url = (url) => {
  try {
    const u = new URL(url);
    const baseUrl = process.env.AWS_S3_BASE_URL;
    const bucket = process.env.AWS_S3_BUCKET;

    if (baseUrl && url.startsWith(baseUrl + "/")) {
      const after = url.slice(baseUrl.length + 1);
      const qIdx = after.indexOf("?");
      const path = qIdx === -1 ? after : after.slice(0, qIdx);
      return path ? decodeURIComponent(path) : null;
    }

    if (!bucket) return null;
    const isVirtualHost =
      u.hostname === `${bucket}.s3.amazonaws.com` ||
      /^([a-z0-9.-]+)\.s3[.-][a-z0-9-]+\.amazonaws\.com$/.test(u.hostname) &&
        u.hostname.startsWith(`${bucket}.`);
    const isPathStyle =
      /^s3[.-][a-z0-9-]+\.amazonaws\.com$/.test(u.hostname) ||
      u.hostname === "s3.amazonaws.com";

    let pathname = u.pathname.startsWith("/") ? u.pathname.slice(1) : u.pathname;
    if (!pathname) return null;

    if (isVirtualHost) {
      return decodeURIComponent(pathname);
    }
    if (isPathStyle && pathname.startsWith(`${bucket}/`)) {
      return decodeURIComponent(pathname.slice(bucket.length + 1));
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Resolve any stored image reference into a **deletable S3 key**, or null if it
 * is not an object in our bucket (local-disk dev path, external CDN URL, empty).
 *
 * This is the deletion-path counterpart of `signStoredImage`. Account deletion
 * (users.service.deleteMyAccount) previously used a naive `isS3Key` guard that
 * treated ANY `http(s)://…` value as "not an S3 key" and skipped it — but
 * post-event media (`media[].url`, `coverImage`, comment image `url`) is often
 * persisted as a FULL bucket URL (e.g. `file.location`), so those personal
 * objects were silently left in S3 forever (REVIEW-FINDINGS P1-02). This helper
 * closes that gap by extracting the key from our-bucket URLs (canonical,
 * virtual-host, and path-style) before deleting.
 *
 *   - bare S3 key (`events/…/x.jpg`)          → returned as-is
 *   - our-bucket URL (any of the 3 shapes)     → extracted key
 *   - `/uploads/…` local-disk dev path         → null (nothing in S3)
 *   - external URL (different host)             → null (not ours to delete)
 *   - null / undefined / non-string            → null
 *
 * @param {string|null|undefined} stored
 * @returns {string|null}
 */
const resolveDeletableS3Key = (stored) => {
  if (!stored || typeof stored !== "string") return null;
  const s = stored.trim();
  if (!s) return null;
  // Local-disk dev paths are never in S3.
  if (s.startsWith("/uploads/") || s.startsWith("uploads/")) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) {
    // Only delete if the URL points at OUR bucket; external URLs are not ours.
    return _extractKeyFromOurS3Url(s) || null;
  }
  // Bare key.
  return s;
};

/**
 * Sign an array of stored image refs in parallel.
 * @param {Array<string>} refs
 * @returns {Promise<Array<string>>}
 */
const signStoredImages = async (refs) => {
  if (!Array.isArray(refs)) return [];
  return Promise.all(refs.map(signStoredImage));
};

/**
 * Delete file (works for both S3 and local)
 * @param {string} filePathOrUrl - File path or S3 URL
 * @param {string} baseDir - Base directory for local files
 * @returns {Promise<boolean>} Success status
 */
const deleteFile = async (filePathOrUrl, baseDir = path.join(__dirname, "../../..")) => {
  if (!filePathOrUrl) return false;

  // Check if it's an S3 URL
  if (isS3Url(filePathOrUrl)) {
    return await deleteFromS3ByUrl(filePathOrUrl);
  }

  // Local file deletion
  try {
    const fullPath = path.join(baseDir, "public", filePathOrUrl);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
  } catch (error) {
    console.error("Error deleting file:", error);
  }
  return false;
};

// File filters (§6 hardening): validate the file EXTENSION in addition to the
// declared MIME so a spoofed Content-Type alone can't smuggle a disallowed
// payload through. (multer-s3 streams to S3, so true magic-byte inspection is a
// scan-service concern — see `scanUploadHook` below.)
const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const VIDEO_EXTS = [".mp4", ".mov", ".m4v", ".webm", ".3gp"];
const DOC_EXTS = [".pdf", ".doc", ".docx", ".xls", ".xlsx"];
const extOf = (name = "") => {
  const m = String(name).toLowerCase().match(/\.[a-z0-9]+$/);
  return m ? m[0] : "";
};
const extAllowed = (name, exts) => exts.includes(extOf(name));

const imageFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (allowedTypes.includes(file.mimetype) && extAllowed(file.originalname, IMAGE_EXTS)) {
    cb(null, true);
  } else {
    cb(
      new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"),
      false
    );
  }
};

const mediaFilter = (req, file, cb) => {
  const isImage =
    file.mimetype.startsWith("image/") && extAllowed(file.originalname, IMAGE_EXTS);
  const isVideo =
    file.mimetype.startsWith("video/") && extAllowed(file.originalname, VIDEO_EXTS);
  if (isImage || isVideo) {
    cb(null, true);
  } else {
    cb(new Error("Only image and video files are allowed"), false);
  }
};

const documentFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (
    allowedTypes.includes(file.mimetype) &&
    extAllowed(file.originalname, [...IMAGE_EXTS, ".pdf", ".doc", ".docx"])
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only images and documents are allowed"), false);
  }
};

const generalFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  if (
    allowedTypes.includes(file.mimetype) &&
    extAllowed(file.originalname, [...IMAGE_EXTS, ...DOC_EXTS])
  ) {
    cb(null, true);
  } else {
    cb(new Error("File type not allowed. Only images, PDFs, and documents are accepted."), false);
  }
};

/**
 * Malware-scan hook point (§6 · UGC-04). When called with an in-memory buffer it
 * runs the quarantine-first magic-byte + malware pipeline (`uploadScan`):
 * magic-byte allowlist → pluggable scanner → FAIL-CLOSED policy. Callers that
 * hold the upload buffer (e.g. a pre-persist validation step, or a
 * quarantine-bucket promote job) pass `{ buffer, declaredMime }` and REJECT on
 * `clean:false`. When called without a buffer it is a pass (nothing to inspect
 * in that path) — magic bytes are only knowable from the bytes themselves.
 *
 * NOTE: multer-s3 streams straight to the bucket, so true magic-byte inspection
 * is done either (a) on a buffered upload path, or (b) after landing the object
 * in a quarantine prefix and reading it back — not mid-stream. This hook is the
 * single policy entry point for both.
 * @param {{buffer?: Buffer, declaredMime?: string}} [ctx]
 * @returns {Promise<{clean: boolean, reason?: string, detected?: string}>}
 */
const scanUploadHook = async (ctx = {}) => {
  const { buffer, declaredMime } = ctx;
  if (!Buffer.isBuffer(buffer)) return { clean: true };
  const { scanBuffer } = require("./uploadScan");
  return scanBuffer(buffer, { declaredMime });
};

// Create S3 storage instance.
//
// Defer the throw to first-upload so a dev box without AWS keys can still
// boot and use endpoints that don't upload anything. Production envs must
// have S3 configured — `createS3Storage()` throws synchronously, which is
// what we want for prod boot-time validation. Pass `ALLOW_LOCAL_UPLOADS=true`
// to opt into the local-disk dev fallback.
let s3Storage;
try {
  s3Storage = createS3Storage();
} catch (err) {
  console.error("[s3Upload] storage init error:", err.message);
  // Replace with a storage stub that fails at upload-time, not at import-time.
  s3Storage = {
    _handleFile(req, file, cb) {
      cb(new Error("Upload rejected: S3 is not configured. " + err.message));
    },
    _removeFile(req, file, cb) {
      cb(null);
    },
  };
}

// Pre-configured multer instances
const uploadImage = multer({
  storage: s3Storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Template/invitation image — hosts can either let the wizard bake the
// preview canvas (always < 1MB) OR upload their own card photo straight
// from a phone camera, which routinely runs 6–10MB. Keep a dedicated
// instance so the general image limit stays tight.
const uploadInvitationImage = multer({
  storage: s3Storage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const uploadMedia = multer({
  storage: s3Storage,
  fileFilter: mediaFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for videos
});

const uploadDocument = multer({
  storage: s3Storage,
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const uploadGeneral = multer({
  storage: s3Storage,
  fileFilter: generalFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Pre-configured upload middlewares
const uploadVendorFiles = uploadGeneral.fields([
  { name: "portfolioImages", maxCount: 10 },
  { name: "businessLogo", maxCount: 1 },
  { name: "pricePackages", maxCount: 5 },
  { name: "commercialRecordImage", maxCount: 1 },
  { name: "nationalIdImage", maxCount: 1 },
  { name: "cv", maxCount: 1 },
  { name: "profileFile", maxCount: 1 },
]);

// Vendors need to attach PDFs/images for the national-ID and commercial-record
// docs at update time, just like they do at signup. Use the general filter
// (images + PDFs + office docs) so the contract matches `uploadVendorFiles`.
const uploadUserProfile = uploadGeneral.fields([
  { name: "businessLogo", maxCount: 1 },
  { name: "avatar", maxCount: 1 },
  { name: "nationalIdImage", maxCount: 1 },
  { name: "commercialRecordImage", maxCount: 1 },
  { name: "portfolioImages", maxCount: 10 },
  { name: "pricePackages", maxCount: 10 },
  { name: "profileFile", maxCount: 1 },
  { name: "cv", maxCount: 1 },
]);

const uploadPostEventMedia = uploadMedia.fields([
  { name: "photos", maxCount: 20 },
  { name: "video", maxCount: 1 },
  { name: "images", maxCount: 10 },
]);

module.exports = {
  // S3 client and config
  s3Client,
  isS3Configured,

  // Direct S3 operations
  uploadToS3,
  uploadMultipleToS3,
  copyS3Object,
  deleteFromS3,
  deleteFromS3ByUrl,
  getSignedUrlForKey,
  getS3Url,
  getKeyFromUrl,
  isS3Url,

  // Multer storage
  s3Storage,
  createS3Storage,
  createLocalStorage,

  // File utilities
  generateFilename,
  getFolderForField,
  getFileUrl,
  getFileUrlSigned,
  processUploadedFiles,
  extractStoredRef,
  signStoredImage,
  signStoredImages,
  resolveDeletableS3Key,
  deleteFile,

  // File filters
  imageFilter,
  mediaFilter,
  documentFilter,
  generalFilter,
  scanUploadHook,

  // Pre-configured multer instances
  uploadImage,
  uploadMedia,
  uploadDocument,
  uploadGeneral,

  // Pre-configured upload middlewares
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
