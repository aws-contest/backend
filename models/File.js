const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
      index: true,
      validate: {
        validator: function (v) {
          return /^[0-9]+_[a-f0-9]+\.[a-z0-9]+$/.test(v);
        },
        message: '올바르지 않은 파일명 형식입니다.',
      },
    },
    originalname: {
      type: String,
      required: true,
      set: function (name) {
        try {
          if (!name) return '';
          const sanitizedName = name.replace(/[\/\\]/g, ''); // Remove path separators
          return sanitizedName.normalize('NFC'); // Unicode normalization
        } catch (error) {
          console.error('Filename sanitization error:', error);
          return name;
        }
      },
      get: function (name) {
        try {
          if (!name) return '';
          return name.normalize('NFC'); // Return normalized name
        } catch (error) {
          console.error('Filename retrieval error:', error);
          return name;
        }
      },
    },
    mimetype: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    url: {
      type: String, // Replace `path` with `url` for S3 integration
      required: true,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// 복합 인덱스
FileSchema.index({ filename: 1, user: 1 }, { unique: true });

// Content-Disposition 헤더를 위한 파일명 인코딩 메서드
FileSchema.methods.getEncodedFilename = function () {
  try {
    const filename = this.originalname;
    if (!filename) return '';

    const encodedFilename = encodeURIComponent(filename)
      .replace(/'/g, "%27")
      .replace(/\(/g, "%28")
      .replace(/\)/g, "%29")
      .replace(/\*/g, "%2A");

    return {
      legacy: filename.replace(/[^\x20-\x7E]/g, ''), // ASCII only for legacy clients
      encoded: `UTF-8''${encodedFilename}`, // RFC 5987 format
    };
  } catch (error) {
    console.error('Filename encoding error:', error);
    return {
      legacy: this.filename,
      encoded: this.filename,
    };
  }
};

// 다운로드용 Content-Disposition 헤더 생성 메서드
FileSchema.methods.getContentDisposition = function (type = 'attachment') {
  const { legacy, encoded } = this.getEncodedFilename();
  return `${type}; filename="${legacy}"; filename*=${encoded}`;
};

// 파일 MIME 타입 검증 메서드
FileSchema.methods.isPreviewable = function () {
  const previewableTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'application/pdf',
  ];
  return previewableTypes.includes(this.mimetype);
};

module.exports = mongoose.model('File', FileSchema);
