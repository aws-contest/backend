const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { uploadToS3, deleteFromS3 } = require('../utils/s3Client');

// 회원가입
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 입력값 검증
    const validationErrors = [];
    if (!name || name.trim().length < 2) {
      validationErrors.push({ field: 'name', message: '이름은 2자 이상이어야 합니다.' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      validationErrors.push({ field: 'email', message: '올바른 이메일 형식이 아닙니다.' });
    }
    if (!password || password.length < 6) {
      validationErrors.push({ field: 'password', message: '비밀번호는 6자 이상이어야 합니다.' });
    }
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, errors: validationErrors });
    }

    // 사용자 중복 확인
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: '이미 가입된 이메일입니다.' });
    }

    // 비밀번호 암호화 및 사용자 생성
    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt(10));
    const newUser = new User({ name, email, password: hashedPassword });

    await newUser.save();
    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      user: { id: newUser._id, name: newUser.name, email: newUser.email, profileImage: newUser.profileImage },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: '회원가입 처리 중 오류가 발생했습니다.' });
  }
};

// 프로필 조회
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: '프로필 조회 중 오류가 발생했습니다.' });
  }
};

// 프로필 업데이트
exports.updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: '이름을 입력해주세요.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    user.name = name.trim();
    await user.save();
    res.json({ success: true, message: '프로필이 업데이트되었습니다.', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: '프로필 업데이트 중 오류가 발생했습니다.' });
  }
};

// 프로필 이미지 업로드
exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '이미지가 제공되지 않았습니다.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    // 기존 프로필 이미지 삭제 (S3에서 삭제)
    if (user.profileImage) {
      const oldImageKey = user.profileImage.split('/').pop();
      await deleteFromS3(oldImageKey);
    }

    // 새 프로필 이미지 업로드
    const imageUrl = await uploadToS3(req.file);
    user.profileImage = imageUrl;
    await user.save();

    res.json({ success: true, message: '프로필 이미지가 업데이트되었습니다.', imageUrl: user.profileImage });
  } catch (error) {
    console.error('Profile image upload error:', error);
    res.status(500).json({ success: false, message: '이미지 업로드 중 오류가 발생했습니다.' });
  }
};

// 프로필 이미지 삭제
exports.deleteProfileImage = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    if (user.profileImage) {
      const imageKey = user.profileImage.split('/').pop();
      await deleteFromS3(imageKey);
      user.profileImage = '';
      await user.save();
    }

    res.json({ success: true, message: '프로필 이미지가 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete profile image error:', error);
    res.status(500).json({ success: false, message: '프로필 이미지 삭제 중 오류가 발생했습니다.' });
  }
};

// 회원 탈퇴
exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    if (user.profileImage) {
      const imageKey = user.profileImage.split('/').pop();
      await deleteFromS3(imageKey);
    }

    await user.deleteOne();
    res.json({ success: true, message: '회원 탈퇴가 완료되었습니다.' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, message: '회원 탈퇴 처리 중 오류가 발생했습니다.' });
  }
};

module.exports = exports;
