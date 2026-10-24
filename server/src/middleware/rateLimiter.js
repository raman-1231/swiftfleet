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

module.exports = {
  authLimiter,
  apiLimiter
};
