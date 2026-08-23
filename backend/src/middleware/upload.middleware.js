const multer = require('multer');
const path = require('path');

// Multer in-memory storage (processes buffer without writing temp files to disk)
const storage = multer.memoryStorage();

// Allowed spreadsheet MIME types and extensions (.xlsx, .xls, .csv)
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv',
  'application/csv',
  'text/plain', // Sometimes CSV files are uploaded as text/plain
  'application/wps-office.xlsx',
  'application/x-excel',
  'application/excel',
  'application/octet-stream', // Generic binary stream
];

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);
  const isAllowedMime = ALLOWED_MIME_TYPES.includes(file.mimetype) || file.mimetype === 'application/octet-stream';

  if (isAllowedExt || isAllowedMime) {
    return cb(null, true);
  }

  const err = new Error('Invalid file format. Only Excel spreadsheets (.xlsx, .xls) and CSV files (.csv) are allowed.');
  err.code = 'INVALID_FILE_TYPE';
  return cb(err, false);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB maximum file size
  },
  fileFilter,
});

/**
 * Middleware wrapper to handle multer errors gracefully with 400 status codes.
 */
function handleUpload(fieldName = 'file') {
  const multerMiddleware = upload.single(fieldName);

  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File size limit exceeded. Maximum allowed file size is 5MB.',
          });
        }
        return res.status(400).json({
          success: false,
          message: `File upload error: ${err.message}`,
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Error processing uploaded file',
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: `No file uploaded. Please attach an Excel or CSV file under form-data key '${fieldName}' (or 'file').`,
        });
      }

      next();
    });
  };
}

module.exports = {
  upload,
  handleUpload,
};
