const multer = require('multer');
const { s3Storage, imageFilter } = require('../../shared/utils/s3Upload');

const receive = multer({ storage: s3Storage,
  fileFilter(req, file, cb) {
    // Older mobile clients still submit this field. Discard it before storage.
    if (file.fieldname === 'coverImage') return cb(null, false);
    return imageFilter(req, file, cb);
  },
  limits: { fileSize: 10 * 1024 * 1024, files: 2, fields: 30 },
}).fields([{ name: 'templateImage', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]);

function uploadEventImages(req, res, next) {
  receive(req, res, error => {
    if (error) return next(error);
    req.file = req.files?.templateImage?.[0];
    next();
  });
}
module.exports = { uploadEventImages };
