const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || (isProduction ? '' : 'swiftfleet_super_secure_jwt_dev_key_2026');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || (isProduction ? '' : '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');

if (isProduction) {
  if (!MONGODB_URI) {
    throw new Error('FATAL: MONGODB_URI environment variable is required in production mode. Refusing to boot with in-memory database.');
  }
  if (!JWT_SECRET || JWT_SECRET === 'swiftfleet_super_secure_jwt_dev_key_2026' || JWT_SECRET.length < 16) {
    throw new Error('FATAL: A strong, unique JWT_SECRET (minimum 16 characters) is required in production mode.');
  }
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
    throw new Error('FATAL: A secure 32-byte ENCRYPTION_KEY is required in production mode for field-level KYC document encryption.');
  }
}

// Parse comma-separated allowed origins or default to localhost
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

function isOriginAllowed(origin) {
  if (!origin) return true; // Server-to-server, curl, mobile native
  const normalized = origin.trim().replace(/\/$/, '');
  if (allowedOrigins.includes(normalized)) return true;
  if (!isProduction && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized)) {
    return true;
  }
  return false;
}

/**
 * Resolves the frontend base URL for client redirects and password reset links.
 * In production mode, localhost is strictly prohibited and guaranteed to fall back
 * to the production Vercel domain (https://swiftfleet-rosy.vercel.app) or configured production origin.
 * Never trusts user-supplied request headers.
 */
function getFrontendBaseUrl() {
  const isProd = (process.env.NODE_ENV === 'production' || NODE_ENV === 'production');

  // Candidate environment variables in order of precedence
  const candidates = [
    process.env.CLIENT_URL,
    process.env.FRONTEND_URL,
    process.env.CLIENT_ORIGIN
  ];

  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;
    // Handle comma-separated lists (e.g. "http://localhost:5173,https://swiftfleet-rosy.vercel.app")
    const origins = raw
      .split(',')
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean);

    if (isProd) {
      // In production, strictly reject localhost and 127.0.0.1
      const validProdOrigin = origins.find(
        (o) => !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(o)
      );
      if (validProdOrigin) {
        return validProdOrigin;
      }
    } else {
      // In development, return the first defined origin
      if (origins.length > 0) {
        return origins[0];
      }
    }
  }

  // Fallbacks
  if (isProd) {
    return 'https://swiftfleet-rosy.vercel.app';
  }
  return 'http://localhost:5173';
}

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI,
  JWT_SECRET,
  ENCRYPTION_KEY,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  CLIENT_URL: process.env.CLIENT_URL || '',
  FRONTEND_URL: process.env.FRONTEND_URL || '',
  ALLOWED_ORIGINS: allowedOrigins,
  isOriginAllowed,
  getFrontendBaseUrl,
  NODE_ENV,
  CURRENCY: process.env.CURRENCY || 'INR',
  CURRENCY_SYMBOL: process.env.CURRENCY_SYMBOL || '₹',
  DEFAULT_LAT: parseFloat(process.env.DEFAULT_LAT || '28.6139'), // New Delhi / India baseline
  DEFAULT_LNG: parseFloat(process.env.DEFAULT_LNG || '77.2090'),
  OFFER_TIMEOUT_SECONDS: parseInt(process.env.OFFER_TIMEOUT_SECONDS || '45', 10),
  BASE_DELIVERY_FARE: parseFloat(process.env.BASE_DELIVERY_FARE || '40.00'), // INR 40.00 base fare
  PER_KM_RATE: parseFloat(process.env.PER_KM_RATE || '12.00'),              // INR 12.00 per km
  WEIGHT_SURCHARGE_PER_KG: parseFloat(process.env.WEIGHT_SURCHARGE_PER_KG || '15.00'), // INR 15.00 / kg above 3kg
  CATEGORY_SURCHARGE: parseFloat(process.env.CATEGORY_SURCHARGE || '25.00'), // INR 25.00 for priority handling
  PARTNER_PAYOUT_RATIO: parseFloat(process.env.PARTNER_PAYOUT_RATIO || '0.78'),
  AUTO_SEED: process.env.AUTO_SEED === 'true'
};
