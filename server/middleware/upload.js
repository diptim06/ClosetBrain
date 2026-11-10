import multer from 'multer';

// 10 MB maximum upload limit
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
]);

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Unsupported file format. Please upload a valid image (JPEG, PNG, WebP, AVIF, or HEIC).'
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter,
});

/**
 * Middleware wrapper to handle Multer upload errors gracefully
 */
export const handleSingleImageUpload = (fieldName = 'image') => {
  const uploadHandler = upload.single(fieldName);

  return (req, res, next) => {
    uploadHandler(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'File size exceeds the 10 MB limit. Please choose a smaller image.',
          });
        }
        return res.status(400).json({
          error: `Upload error: ${err.message}`,
        });
      } else if (err) {
        return res.status(400).json({
          error: err.message || 'Failed to process uploaded file.',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: 'No image file was provided. Please attach an image.',
        });
      }

      next();
    });
  };
};

export default handleSingleImageUpload;
