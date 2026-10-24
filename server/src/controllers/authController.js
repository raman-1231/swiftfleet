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

exports.registerBusiness = async (req, res, next) => {
  try {
    const { name, email, password, phone, companyName, category, address } = req.body;

    if (!name || !email || !password || !companyName) {
      return res.status(400).json({ message: 'Name, email, password, and company name are required.' });
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
      address: address || '350 5th Ave, New York, NY 10118',
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
      idDocumentNumber
    } = req.body;

    if (!name || !email || !password || !licenseNumber) {
      return res.status(400).json({ message: 'Name, email, password, and license number are required.' });
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
      phone: phone || ''
    });

    // Generate simulated document identifier for verification audit
    const simulatedDocUrl = `/uploads/documents/doc_${Date.now()}_verified.pdf`;

    const partnerProfile = await PartnerProfile.create({
      userId: user._id,
      verificationStatus: 'pending',
      vehicleType: vehicleType || 'motorcycle',
      licenseNumber,
      idDocumentType: idDocumentType || 'Driver License',
      idDocumentNumber: idDocumentNumber || `DL-${Math.floor(100000 + Math.random() * 900000)}`,
      idDocumentUrl: simulatedDocUrl,
      isOnline: false,
      isAvailable: true,
      currentCoordinates: {
        type: 'Point',
        coordinates: [-73.9851 + (Math.random() - 0.5) * 0.05, 40.7484 + (Math.random() - 0.5) * 0.05]
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
      return res.status(401).json({ message: 'Invalid credentials. User not found.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials. Incorrect password.' });
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
