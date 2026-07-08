/**
 * File Upload Utility
 * Thin wrapper that delegates to s3Upload (which handles local fallback internally)
 * @module shared/utils/fileUpload
 */

const s3Upload = require("./s3Upload");

module.exports = {
  // Storage configuration
  storage: s3Upload.s3Storage,
  useS3: s3Upload.isS3Configured(),

  // Multer instances
  uploadImage: s3Upload.uploadImage,
  uploadMedia: s3Upload.uploadMedia,
  uploadGeneral: s3Upload.uploadGeneral,

  // File utilities
  getFileUrl: s3Upload.getFileUrl,
  getRelativeFilePath: s3Upload.getFileUrl,
  deleteFile: s3Upload.deleteFile,
  processVendorFiles: s3Upload.processUploadedFiles,
  processUploadedFiles: s3Upload.processUploadedFiles,

  // Pre-configured upload middlewares
  uploadLogo: s3Upload.uploadLogo,
  uploadMultipleImages: s3Upload.uploadMultipleImages,
  uploadPortfolio: s3Upload.uploadPortfolio,
  uploadTemplateImage: s3Upload.uploadTemplateImage,
  uploadServiceImage: s3Upload.uploadServiceImage,
  uploadAvatar: s3Upload.uploadAvatar,
  uploadVendorFiles: s3Upload.uploadVendorFiles,
  uploadUserProfile: s3Upload.uploadUserProfile,
  uploadPostEventMedia: s3Upload.uploadPostEventMedia,

  // Re-export S3 utilities for direct access
  s3Upload,
};
