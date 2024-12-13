const multer = require('multer');
const path = require('path');
const { uploadToS3 } = require('../utils/s3Client');

// MIME 타입과 확장자 매핑
// const ALLOWED_TYPES = {
//   'image/jpeg': ['.jpg', '.jpeg'],
//   'image/png': ['.png'],
//   'image/gif': ['.gif'],
//   'image/webp': ['.webp'],
// };

// MIME 타입과 확장자 매핑
const ALLOWED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/ogg': ['.ogg'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
};

// 파일 타입별 크기 제한 설정
const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB for profile images
};

// multer memory storage configuration
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  try {
    const originalname = Buffer.from(file.originalname, 'binary').toString('utf8');
    const ext = path.extname(originalname).toLowerCase();

    // MIME type and extension validation
    if (!ALLOWED_TYPES[file.mimetype] || !ALLOWED_TYPES[file.mimetype].includes(ext)) {
      return cb(new Error(`Invalid file type: ${file.mimetype}`), false);
    }

    // Attach the original file name to the request object for logging/debugging
    req.originalFileName = originalname;

    cb(null, true);
  } catch (error) {
    console.error('File filter error:', error);
    cb(error);
  }
};

const validateFileSize = (file) => {
  const limit = FILE_SIZE_LIMITS.image;

  if (file.size > limit) {
    const limitInMB = Math.floor(limit / 1024 / 1024);
    throw new Error(`File size exceeds ${limitInMB}MB`);
  }
  return true;
};

// multer middleware for memory storage
const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: FILE_SIZE_LIMITS.image, // 5MB
    files: 1, // Allow one file at a time
  },
  fileFilter,
});

// Middleware to upload files to S3
const uploadToS3Middleware = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    // Validate file size before uploading
    validateFileSize(req.file);

    // Upload the file to S3
    const fileUrl = await uploadToS3(req.file);

    // Attach the S3 URL to the request object
    req.fileUrl = fileUrl;

    next();
  } catch (error) {
    console.error('S3 upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload file to S3' });
  }
};

const errorHandler = (error, req, res, next) => {
  console.error('File upload error:', error.message);
  res.status(400).json({
    success: false,
    message: error.message || 'An error occurred during file upload.',
  });
};

// Export modules
module.exports = {
  upload: uploadMiddleware,
  uploadToS3Middleware,
  errorHandler,
};
