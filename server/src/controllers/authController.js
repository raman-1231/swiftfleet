const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PartnerProfile = require('../models/PartnerProfile');
const BusinessProfile = require('../models/BusinessProfile');
const AuditLog = require('../models/AuditLog');
const emailService = require('../services/emailService');
const env = require('../config/env');

function generateToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

// Indian mobile number validation (10 digits starting with 6, 7, 8, or 9)
function isValidIndianPhone(phone) {
  if (!phone) return true; // Optional on initial basic signup, validated when provided
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return /^(\+91|0)?[6-9]\d{9}$/.test(cleaned);
}

exports.registerBusiness = async (req, res, next) => {
  try {
    const { name, email, password, phone, companyName, category, address, pincode, gstin } = req.body;

    if (!name || !email || !password || !companyName) {
      return res.status(400).json({ message: 'Name, email, password, and company name are required.' });
    }

    if (phone && !isValidIndianPhone(phone)) {
      return res.status(400).json({ message: 'Please provide a valid 10-digit Indian mobile number.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email address already exists.' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'business',
      phone: phone || ''
    });

    const businessProfile = await BusinessProfile.create({
      userId: user._id,
      companyName,
      category: category || 'retail',
      address: address || '',
      pincode: pincode || '',
      gstin: gstin || '',
      phone: phone || ''
    });

    const token = generateToken(user);

    res.status(201).json({
      message: 'Business account successfully created.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      },
      profile: businessProfile
    });
  } catch (error) {
    next(error);
  }
};

exports.registerPartner = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      vehicleType,
      licenseNumber,
      idDocumentType,
      idDocumentNumber,
      idDocumentUrl
    } = req.body;

    if (!name || !email || !password || !licenseNumber) {
      return res.status(400).json({ message: 'Name, email, password, and license number are required.' });
    }

    if (phone && !isValidIndianPhone(phone)) {
      return res.status(400).json({ message: 'Please provide a valid 10-digit Indian mobile number.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email address already exists.' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'partner',
      phone: phone || '',
      isPhoneVerified: false
    });

    // Support genuine document reference; disable simulated fake file URLs
    const documentAssetUrl = idDocumentUrl || '';

    const partnerProfile = await PartnerProfile.create({
      userId: user._id,
      verificationStatus: 'pending',
      verificationNotes: 'Application submitted. Document inspection pending by compliance operations officer.',
      vehicleType: vehicleType || 'motorcycle',
      licenseNumber,
      idDocumentType: idDocumentType || 'Driving Licence',
      idDocumentNumber: idDocumentNumber || licenseNumber,
      idDocumentUrl: documentAssetUrl,
      isOnline: false,
      isAvailable: true,
      currentCoordinates: {
        type: 'Point',
        coordinates: [
          env.DEFAULT_LNG + (Math.random() - 0.5) * 0.02,
          env.DEFAULT_LAT + (Math.random() - 0.5) * 0.02
        ]
      }
    });

    const token = generateToken(user);

    res.status(201).json({
      message: 'Courier account created. Verification submitted for review by operations team.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      },
      profile: partnerProfile
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ message: 'Please provide both email and password.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    const user = await User.findOne({ email: trimmedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended. Please reach out to administrative support.' });
    }

    let profile = null;
    if (user.role === 'partner') {
      profile = await PartnerProfile.findOne({ userId: user._id });
    } else if (user.role === 'business') {
      profile = await BusinessProfile.findOne({ userId: user._id });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      },
      profile
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    const genericSuccessResponse = {
      message: 'If an account exists with that email address, a password reset link has been sent.'
    };

    const user = await User.findOne({ email: trimmedEmail }).select('+passwordResetTokenHash +passwordResetExpiresAt +passwordResetCooldownUntil');
    if (!user || user.status === 'suspended') {
      // Generic response to prevent account enumeration
      return res.json(genericSuccessResponse);
    }

    // Cooldown check (60 seconds)
    if (user.passwordResetCooldownUntil && new Date() < new Date(user.passwordResetCooldownUntil)) {
      return res.json(genericSuccessResponse);
    }

    // Generate secure unguessable 64-char token and SHA-256 hash
    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry
    const cooldownUntil = new Date(Date.now() + 60 * 1000); // 60s cooldown

    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpiresAt = expiresAt;
    user.passwordResetCooldownUntil = cooldownUntil;
    await user.save();

    // Determine production frontend URL
    const rawOrigin = process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || (env.NODE_ENV === 'production' ? 'https://swiftfleet-rosy.vercel.app' : 'http://localhost:5173');
    const frontendOrigin = rawOrigin.split(',')[0].trim().replace(/\/$/, '');
    const resetUrl = `${frontendOrigin}/reset-password?token=${rawResetToken}`;

    // Dispatch email
    try {
      await emailService.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl
      });
    } catch (mailErr) {
      console.error('❌ [Auth] Failed to dispatch password reset email:', mailErr.message);
    }

    // Audit log request
    try {
      await AuditLog.create({
        actorName: user.name,
        actorRole: user.role,
        action: 'PASSWORD_RESET_REQUESTED',
        targetType: 'User',
        targetId: user._id.toString(),
        metadata: {
          email: user.email,
          expiresAt
        },
        ipAddress: req.ip || '127.0.0.1'
      });
    } catch (_) {}

    res.json(genericSuccessResponse);
  } catch (error) {
    next(error);
  }
};

exports.validateResetToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token.trim())) {
      return res.status(400).json({ valid: false, message: 'Password reset link is invalid or has expired.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() }
    }).select('+passwordResetTokenHash +passwordResetExpiresAt');

    if (!user) {
      return res.status(400).json({ valid: false, message: 'Password reset link is invalid or has expired.' });
    }

    res.json({ valid: true, message: 'Password reset link is valid.' });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token.trim())) {
      return res.status(400).json({ message: 'Password reset link is invalid or has expired.' });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirmation password do not match.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() }
    }).select('+password +passwordResetTokenHash +passwordResetExpiresAt');

    if (!user) {
      return res.status(400).json({ message: 'Password reset link is invalid or has expired.' });
    }

    // Set new password (pre-save hook will bcrypt hash it)
    user.password = newPassword;
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    user.passwordResetCooldownUntil = null;
    await user.save();

    // Audit log
    try {
      await AuditLog.create({
        actorName: user.name,
        actorRole: user.role,
        action: 'PASSWORD_RESET_COMPLETED',
        targetType: 'User',
        targetId: user._id.toString(),
        metadata: {
          email: user.email
        },
        ipAddress: req.ip || '127.0.0.1'
      });
    } catch (_) {}

    res.json({
      message: 'Password has been reset successfully. You may now sign in with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = req.user;
    let profile = null;

    if (user.role === 'partner') {
      profile = await PartnerProfile.findOne({ userId: user._id });
    } else if (user.role === 'business') {
      profile = await BusinessProfile.findOne({ userId: user._id });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      },
      profile
    });
  } catch (error) {
    next(error);
  }
};
