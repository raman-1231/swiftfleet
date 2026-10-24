require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET || 'swiftfleet_super_secure_jwt_dev_key_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',
  OFFER_TIMEOUT_SECONDS: parseInt(process.env.OFFER_TIMEOUT_SECONDS || '45', 10),
  BASE_DELIVERY_FARE: parseFloat(process.env.BASE_DELIVERY_FARE || '5.00'),
  PER_KM_RATE: parseFloat(process.env.PER_KM_RATE || '1.80'),
  PARTNER_PAYOUT_RATIO: parseFloat(process.env.PARTNER_PAYOUT_RATIO || '0.78') // 78% of order fare to driver
};
