const multer = require('multer');
const sharp = require('sharp');
const crypto = require('crypto');
const { AppError } = require('../../shared/errors');
const storage = require('../../shared/utils/storageDriver');
const { uploadToS3, s3Storage, imageFilter } = require('../../shared/utils/s3Upload');

const LIMITS = { bytes: 10 * 1024 * 1024, pixels: 40000000, side: 8192 };
const memory = multer.memoryStorage();
// Preserve the existing streaming invitation-image pipeline for personal hosts.
const uploadStorage = {
  _handleFile(req, file, cb) { (file.fieldname === 'coverImage' ? memory : s3Storage)._handleFile(req, file, cb); },
  _removeFile(req, file, cb) { (file.fieldname === 'coverImage' ? memory : s3Storage)._removeFile(req, file, cb); },
};
const receive = multer({ storage: uploadStorage, fileFilter: imageFilter, limits: { fileSize: LIMITS.bytes, files: 2, fields: 30 } })
  .fields([{ name: 'templateImage', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]);

async function storeImage(buffer, folder, filename, type) {
  if (storage.isLocalStorage()) {
    const ref = await storage.writeLocalObject({ key: `${folder}/${crypto.randomUUID()}-${filename}`, body: buffer });
    return { key: ref, location: ref };
  }
  const result = await uploadToS3(buffer, folder, filename, type);
  return { key: result.key, location: result.url };
}

function uploadEventImages(req, res, next) {
  receive(req, res, (error) => {
    if (error) return next(error);
    try {
      req.coverFile = req.files?.coverImage?.[0];
      req.file = req.files?.templateImage?.[0];
      next();
    } catch (err) { next(err); }
  });
}

async function optimizeCover(file) {
  if (!file?.buffer || file.buffer.length > LIMITS.bytes) {
    throw new AppError('An event cover of up to 10 MB is required.', 400, 'BUSINESS_COVER_REQUIRED');
  }
  try {
    const scan = require('../../shared/utils/uploadScan').verifyMagicBytes(file.buffer, file.mimetype);
    if (!scan.ok) throw new Error('Invalid cover');
    const source = sharp(file.buffer, { limitInputPixels: LIMITS.pixels, failOn: 'error' });
    const meta = await source.metadata();
    if (file.mimetype !== `image/${meta.format}`) throw new Error('Format mismatch');
    if (!['jpeg', 'png', 'webp'].includes(meta.format) || (meta.pages || 1) !== 1 ||
        meta.width > LIMITS.side || meta.height > LIMITS.side || meta.width < 960 || meta.height < 540) throw new Error('dimensions');
    return await source.rotate().resize(1600, 900, { fit: 'cover', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  } catch (_) {
    throw new AppError('Use a still JPEG, PNG or WebP cover, at least 960 × 540, at most 8192 pixels per side and 40 megapixels.', 400, 'INVALID_BUSINESS_COVER');
  }
}

module.exports = { uploadEventImages, optimizeCover, storeImage, LIMITS };
