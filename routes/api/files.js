const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const fileController = require('../../controllers/fileController');
const { upload, uploadToS3Middleware, errorHandler } = require('../../middleware/upload');

// 파일 업로드
router.post(
  '/upload',
  auth, // Authenticate the user
  upload.single('file'), // Validate and parse the uploaded file
  uploadToS3Middleware, // Upload the file to S3 and attach the S3 URL to req.fileUrl
  errorHandler, // Handle errors from the above middlewares
  fileController.uploadFile // Pass control to the file controller for saving metadata
);

// 파일 다운로드
// router.get(
//   '/download/:filename',
//   auth, // Authenticate the user
//   fileController.downloadFile // Delegate file download logic to the controller
// );

// 파일 보기 (미리보기용)
router.get(
  '/view/:filename',
  auth, // Authenticate the user
  fileController.viewFile // Delegate file viewing logic to the controller
);

// 파일 삭제
router.delete(
  '/:id',
  auth, // Authenticate the user
  fileController.deleteFile // Delegate file deletion logic to the controller
);

module.exports = router;
