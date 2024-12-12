const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { encryptionKey, passwordSalt } = require('../config/keys');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '이름은 필수 입력 항목입니다.'],
    trim: true,
    minlength: [2, '이름은 2자 이상이어야 합니다.'],
  },
  email: {
    type: String,
    required: [true, '이메일은 필수 입력 항목입니다.'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      '올바른 이메일 형식이 아닙니다.',
    ],
  },
  encryptedEmail: {
    type: String,
    unique: true,
    sparse: true,
  },
  password: {
    type: String,
    required: [true, '비밀번호는 필수 입력 항목입니다.'],
    minlength: [6, '비밀번호는 6자 이상이어야 합니다.'],
    select: false,
  },
  profileImage: {
    type: String,
    default: null, // Use `null` instead of an empty string for better semantics
    validate: {
      validator: function (v) {
        if (!v) return true; // Allow null
        return /^https?:\/\/[^\s$.?#].[^\s]*$/.test(v); // Validate URL format
      },
      message: '유효하지 않은 URL 형식입니다.',
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
});

// 이메일 암호화 함수
function encryptEmail(email) {
  if (!email) return null;
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
    let encrypted = cipher.update(email, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Email encryption error:', error);
    return null;
  }
}

// 비밀번호 해싱 및 이메일 암호화 미들웨어
UserSchema.pre('save', async function (next) {
  try {
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    if (this.isModified('email')) {
      this.encryptedEmail = encryptEmail(this.email);
    }
    next();
  } catch (error) {
    next(error);
  }
});

// 비밀번호 비교 메서드
UserSchema.methods.matchPassword = async function (enteredPassword) {
  try {
    const user = await this.constructor.findById(this._id).select('+password');
    if (!user || !user.password) {
      return false;
    }
    return await bcrypt.compare(enteredPassword, user.password);
  } catch (error) {
    console.error('Password match error:', error);
    return false;
  }
};

// 프로필 이미지 업데이트 메서드
UserSchema.methods.updateProfileImage = async function (imageUrl) {
  try {
    this.profileImage = imageUrl || null; // Set to null if no image URL is provided
    return await this.save();
  } catch (error) {
    console.error('Profile image update error:', error);
    throw error;
  }
};

// 이메일 복호화 메서드
UserSchema.methods.decryptEmail = function () {
  if (!this.encryptedEmail) return null;

  try {
    const [ivHex, encryptedHex] = this.encryptedEmail.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Email decryption error:', error);
    return null;
  }
};

// 활성 상태 업데이트 메서드
UserSchema.methods.updateLastActive = async function () {
  this.lastActive = new Date();
  return this.save();
};

// 인덱스 생성
UserSchema.index({ email: 1 });
UserSchema.index({ encryptedEmail: 1 }, { unique: true, sparse: true });
UserSchema.index({ createdAt: 1 });
UserSchema.index({ lastActive: 1 });

module.exports = mongoose.model('User', UserSchema);
