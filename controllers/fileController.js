const File = require('../models/File');
const { uploadToS3, deleteFromS3 } = require('../utils/s3Client');
const path = require('path');
const crypto = require('crypto');

// Generate a safe filename (for database metadata)
const generateSafeFilename = (originalFilename) => {
  const ext = path.extname(originalFilename || '').toLowerCase();
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  return `${timestamp}_${randomBytes}${ext}`;
};

// Upload File
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '파일이 선택되지 않았습니다.',
      });
    }

    // Upload file to S3
    const fileUrl = await uploadToS3(req.file);

    const file = new File({
      filename: generateSafeFilename(req.file.originalname),
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      user: req.user.id,
      url: fileUrl, // Save S3 URL instead of local path
    });

    await file.save();

    res.status(200).json({
      success: true,
      message: '파일 업로드 성공',
      file: {
        _id: file._id,
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        uploadDate: file.uploadDate,
        url: fileUrl, // Return the S3 URL
      },
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: '파일 업로드 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// Download File
exports.downloadFile = async (req, res) => {
  try {
    // const file = await File.findOne({ filename: req.params.filename });
    const file = await File.findOne({ filename: req.params.filename }).lean();

    if (!file) {
      return res.status(404).json({
        success: false,
        message: '파일을 찾을 수 없습니다.',
      });
    }

    res.redirect(file.url); // Redirect to the S3 URL
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({
      success: false,
      message: '파일 다운로드 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// View File
exports.viewFile = async (req, res) => {
  try {
    const file = await File.findOne({ filename: req.params.filename });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: '파일을 찾을 수 없습니다.',
      });
    }

    // Check if file is previewable (extend this logic as needed)
    if (!file.isPreviewable || typeof file.isPreviewable !== 'function' || !file.isPreviewable()) {
      return res.status(415).json({
        success: false,
        message: '미리보기를 지원하지 않는 파일 형식입니다.',
      });
    }

    res.redirect(file.url); // Redirect to the S3 URL
  } catch (error) {
    console.error('File view error:', error);
    res.status(500).json({
      success: false,
      message: '파일 보기 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};

// Delete File
exports.deleteFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: '파일을 찾을 수 없습니다.',
      });
    }

    if (file.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: '파일을 삭제할 권한이 없습니다.',
      });
    }

    // Delete the file from S3
    const s3Key = file.url.split('/').pop(); // Extract the S3 key from the URL
    await deleteFromS3(s3Key);

    await file.deleteOne();

    res.json({
      success: true,
      message: '파일이 삭제되었습니다.',
    });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({
      success: false,
      message: '파일 삭제 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
};
