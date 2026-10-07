import multer from 'multer';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 6;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    const err = new Error('Only JPEG, PNG and WebP images are allowed');
    err.code = 'INVALID_FILE_TYPE';
    cb(err);
  },
});

// Usage in routes:
//   router.post('/', auth, businessImages, createBusiness)
//   router.post('/:id/deals', auth, dealBanner, createDeal)
export const businessImages = upload.array('images', MAX_FILES);
export const dealBanner = upload.single('banner');

// Register AFTER routes, before the generic error handler.
export function handleUploadError(err, _req, res, next) {
  if (err instanceof multer.MulterError || err.code === 'INVALID_FILE_TYPE') {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 5 MB or smaller'
      : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE' ? `Maximum ${MAX_FILES} images allowed`
      : err.message;
    return res.status(400).json({ success: false, data: null, error: message });
  }
  next(err);
}
