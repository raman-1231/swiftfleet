const rateLimit = require('express-rate-limit');

// Sensitive auth limiter: 25 attempts per 15 mins
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
  }
});

// Standard API limiter: 300 requests per 15 mins
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Rate limit exceeded. Please throttle your requests.'
  }
});

// Customer public tracking query limiter: 150 requests per 15 mins
const trackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Tracking request limit reached. Please wait a few moments before refreshing.'
  }
});

// Customer delivery PIN regeneration limiter: 10 regenerations per 15 mins per IP
const pinRegenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many delivery PIN regeneration attempts. Please wait before requesting another PIN.'
  }
});

module.exports = {
  authLimiter,
  apiLimiter,
  trackingLimiter,
  pinRegenLimiter
};
