const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Generate secure random tokens
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Hash sensitive data
const hashData = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Verify JWT token securely
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Generate JWT with secure options
const generateToken = (payload, expiresIn = '24h') => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn,
    issuer: 'event-management-system',
    audience: 'event-management-users'
  });
};

// Sanitize user input to prevent XSS
const sanitizeHtml = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Rate limiting key generator
const generateRateLimitKey = (req, identifier = 'ip') => {
  switch (identifier) {
    case 'user':
      return req.user?.id || req.ip;
    case 'email':
      return req.body?.email || req.ip;
    default:
      return req.ip;
  }
};

// Security headers helper
const getSecurityHeaders = () => ({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
});

module.exports = {
  generateSecureToken,
  hashData,
  verifyToken,
  generateToken,
  sanitizeHtml,
  generateRateLimitKey,
  getSecurityHeaders
};