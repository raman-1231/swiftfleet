const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const PartnerProfile = require('../models/PartnerProfile');

async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required. No Bearer token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User account no longer exists.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'This account has been suspended by administration.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid or forged token.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: Access requires one of [${roles.join(', ')}] role(s). Your role is '${req.user.role}'.`
      });
    }
    next();
  };
}

async function requireApprovedPartner(req, res, next) {
  try {
    if (req.user.role !== 'partner') {
      return next();
    }

    const profile = await PartnerProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(403).json({ message: 'Partner profile missing. Please complete registration.' });
    }

    if (profile.verificationStatus !== 'approved') {
      return res.status(403).json({
        message: `Partner account is currently '${profile.verificationStatus}'. Delivery actions require 'approved' status from operations.`,
        verificationStatus: profile.verificationStatus
      });
    }

    req.partnerProfile = profile;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  verifyToken,
  requireRole,
  requireApprovedPartner
};
