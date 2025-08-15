const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const hpp = require('hpp');

// Rate limiting configurations
const createRateLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message, code: 'RATE_LIMIT_EXCEEDED' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiting
const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many requests, please try again later'
);

// Strict rate limiting for auth endpoints
const authLimiter = createRateLimiter(
  parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 20, // 20 attempts per window
  'Too many authentication attempts, please try again later'
);

// Booking rate limiting
const bookingLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  3, // 3 bookings per minute
  'Too many booking attempts, please slow down'
);

// XSS sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    }
  }
  
  // Sanitize query parameters
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = xss(req.query[key]);
      }
    }
  }
  
  next();
};

// Security middleware stack
const securityMiddleware = [
  mongoSanitize(), // Prevent NoSQL injection
  hpp(), // Prevent HTTP Parameter Pollution
  sanitizeInput // XSS protection
];

module.exports = {
  generalLimiter,
  authLimiter,
  bookingLimiter,
  securityMiddleware
};