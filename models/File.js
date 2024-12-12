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
          console.error('Filename sanitization error:', error, { name });
          return name;
        }
      },
      get: function (name) {
        try {
          if (!name) return '';
          return name.normalize('NFC'); // Return normalized name
        } catch (error) {
          console.error('Filename retrieval error:', error, { name });
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
      type: String,
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

FileSchema.methods.getEncodedFilename = function () {
  try {
    const filename = this.originalname || this.filename || 'file';
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
    console.error('Filename encoding error:', error, { originalname: this.originalname });
    return {
      legacy: this.filename || 'file',
      encoded: this.filename || 'file',
    };
  }
};

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
