/** Thin wrapper around durable VPS-local uploads. */

const localUpload = require("./localUpload");

module.exports = {
  // Storage configuration
  storage: localUpload.localStorage,

  // Multer instances
  uploadImage: localUpload.uploadImage,
  uploadMedia: localUpload.uploadMedia,
  uploadGeneral: localUpload.uploadGeneral,

  // File utilities
  getFileUrl: localUpload.getFileUrl,
  getRelativeFilePath: localUpload.getFileUrl,
  deleteFile: localUpload.deleteFile,
  cleanupUploadedFiles: localUpload.cleanupUploadedFiles,
  processVendorFiles: localUpload.processUploadedFiles,
  processUploadedFiles: localUpload.processUploadedFiles,

  // File filters
  vendorSignupFilter: localUpload.vendorSignupFilter,

  // Pre-configured upload middlewares
  uploadLogo: localUpload.uploadLogo,
  uploadMultipleImages: localUpload.uploadMultipleImages,
  uploadPortfolio: localUpload.uploadPortfolio,
  uploadTemplateImage: localUpload.uploadTemplateImage,
  uploadServiceImage: localUpload.uploadServiceImage,
  uploadAvatar: localUpload.uploadAvatar,
  uploadVendorFiles: localUpload.uploadVendorFiles,
  uploadUserProfile: localUpload.uploadUserProfile,
  uploadPostEventMedia: localUpload.uploadPostEventMedia,
  localUpload,
};
