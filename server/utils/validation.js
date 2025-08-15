const { body, param, query, validationResult } = require('express-validator');

// Helper function to handle validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// User validation rules
const userValidation = {
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('firstName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1 and 50 characters'),
    body('lastName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be between 1 and 50 characters'),
    body('phone')
      .optional()
      .matches(/^\+?[\d\s\-\(\)]+$/)
      .withMessage('Please provide a valid phone number'),
    handleValidationErrors
  ],

  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    handleValidationErrors
  ],

  update: [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1 and 50 characters'),
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be between 1 and 50 characters'),
    body('phone')
      .optional()
      .matches(/^\+?[\d\s\-\(\)]+$/)
      .withMessage('Please provide a valid phone number'),
    handleValidationErrors
  ]
};

// Event validation rules
const eventValidation = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Title must be between 1 and 100 characters'),
    body('description')
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Description must be between 1 and 2000 characters'),
    body('category')
      .isIn(['conference', 'workshop', 'meetup', 'concert', 'sports', 'networking', 'seminar', 'other'])
      .withMessage('Please provide a valid category'),
    body('venue.name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Venue name must be between 1 and 100 characters'),
    body('venue.address')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Venue address must be between 1 and 200 characters'),
    body('venue.city')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('City must be between 1 and 50 characters'),
    body('dateTime.start')
      .isISO8601()
      .withMessage('Please provide a valid start date')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Start date must be in the future');
        }
        return true;
      }),
    body('dateTime.end')
      .isISO8601()
      .withMessage('Please provide a valid end date')
      .custom((value, { req }) => {
        if (new Date(value) <= new Date(req.body.dateTime.start)) {
          throw new Error('End date must be after start date');
        }
        return true;
      }),
    body('capacity.total')
      .isInt({ min: 1 })
      .withMessage('Total capacity must be at least 1'),
    body('pricing.isFree')
      .isBoolean()
      .withMessage('isFree must be a boolean'),
    body('pricing.ticketPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Ticket price must be a positive number')
      .custom((value, { req }) => {
        if (!req.body.pricing.isFree && (value === undefined || value === null)) {
          throw new Error('Ticket price is required for paid events');
        }
        return true;
      }),
    body('images')
      .optional()
      .isArray()
      .withMessage('Images must be an array'),
    body('images.*')
      .optional()
      .isURL()
      .withMessage('Each image must be a valid URL'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('tags.*')
      .optional()
      .trim()
      .isLength({ max: 30 })
      .withMessage('Each tag must be no more than 30 characters'),
    handleValidationErrors
  ],

  update: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Title must be between 1 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Description must be between 1 and 2000 characters'),
    body('category')
      .optional()
      .isIn(['conference', 'workshop', 'meetup', 'concert', 'sports', 'networking', 'seminar', 'other'])
      .withMessage('Please provide a valid category'),
    body('dateTime.start')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid start date')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Start date must be in the future');
        }
        return true;
      }),
    body('dateTime.end')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid end date'),
    body('capacity.total')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Total capacity must be at least 1'),
    body('pricing.ticketPrice')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Ticket price must be a positive number'),
    handleValidationErrors
  ],

  list: [
    query('page')
      .optional({ checkFalsy: true })
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional({ checkFalsy: true })
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    query('cursor')
      .optional({ checkFalsy: true })
      .isLength({ min: 1 })
      .withMessage('Cursor must be a valid string'),
    query('category')
      .optional({ checkFalsy: true })
      .isIn(['conference', 'workshop', 'meetup', 'concert', 'sports', 'networking', 'seminar', 'other'])
      .withMessage('Please provide a valid category'),
    query('city')
      .optional({ checkFalsy: true })
      .isLength({ min: 1 })
      .withMessage('City must be a valid string'),
    query('search')
      .optional({ checkFalsy: true })
      .isLength({ min: 1 })
      .withMessage('Search must be a valid string'),
    query('startDate')
      .optional({ checkFalsy: true })
      .isISO8601()
      .withMessage('Please provide a valid start date'),
    query('endDate')
      .optional({ checkFalsy: true })
      .isISO8601()
      .withMessage('Please provide a valid end date'),
    query('sort')
      .optional({ checkFalsy: true })
      .isIn(['-dateTime.start', 'dateTime.start', '-createdAt', 'createdAt'])
      .withMessage('Invalid sort parameter'),
    handleValidationErrors
  ]
};

// Booking validation rules
const bookingValidation = {
  create: [
    body('eventId')
      .isMongoId()
      .withMessage('Please provide a valid event ID'),
    body('quantity')
      .isInt({ min: 1, max: 10 })
      .withMessage('Quantity must be between 1 and 10'),
    body('attendeeInfo')
      .isArray({ min: 1 })
      .withMessage('Attendee information is required'),
    body('attendeeInfo.*.firstName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Attendee first name must be between 1 and 50 characters'),
    body('attendeeInfo.*.lastName')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Attendee last name must be between 1 and 50 characters'),
    body('attendeeInfo.*.email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid attendee email'),
    body('attendeeInfo.*.phone')
      .optional()
      .matches(/^\+?[\d\s\-\(\)]+$/)
      .withMessage('Please provide a valid phone number'),
    body('ticketType')
      .optional()
      .isIn(['regular', 'vip', 'student', 'early_bird'])
      .withMessage('Please provide a valid ticket type'),
    handleValidationErrors
  ],

  update: [
    body('status')
      .optional()
      .isIn(['pending', 'confirmed', 'cancelled', 'waitlisted'])
      .withMessage('Please provide a valid status'),
    body('notes')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Notes cannot be more than 1000 characters'),
    handleValidationErrors
  ]
};

// Common parameter validations
const paramValidation = {
  mongoId: [
    param('id')
      .isMongoId()
      .withMessage('Please provide a valid ID'),
    handleValidationErrors
  ]
};

module.exports = {
  userValidation,
  eventValidation,
  bookingValidation,
  paramValidation,
  handleValidationErrors
};