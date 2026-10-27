const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PartnerProfile = require('../models/PartnerProfile');
const BusinessProfile = require('../models/BusinessProfile');
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

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
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
