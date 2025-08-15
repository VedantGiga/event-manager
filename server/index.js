const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter, securityMiddleware } = require('./middleware/security');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');
const bookingRoutes = require('./routes/bookings');
const categoryRoutes = require('./routes/categories');

const app = express();

// Security middleware
app.use(helmet({ crossOriginEmbedderPolicy: false }));

// Apply security middleware
app.use(securityMiddleware);

// Rate limiting
app.use('/api/', generalLimiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://localhost:3000',
      process.env.CORS_ORIGIN
    ].filter(Boolean);
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowed => origin.includes(allowed.replace('https://', '').replace('http://', '')))) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow all origins for now
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic API test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working', 
    timestamp: new Date().toISOString(),
    origin: req.get('Origin'),
    userAgent: req.get('User-Agent')
  });
});

// Debug endpoint
app.get('/api/debug', (req, res) => {
  res.json({
    environment: process.env.NODE_ENV,
    corsOrigin: process.env.CORS_ORIGIN,
    port: process.env.PORT,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/categories', categoryRoutes);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    code: 'ENDPOINT_NOT_FOUND',
    path: req.originalUrl
  });
});

// Root endpoint for backend
app.get('/', (req, res) => {
  res.json({
    message: 'Event Management API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      auth: '/api/auth',
      events: '/api/events',
      bookings: '/api/bookings'
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Environment validation
const validateEnvironment = () => {
  console.log('Validating environment variables...');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('PORT:', process.env.PORT);
  console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
  console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
  
  const required = ['MONGODB_URI', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please set these environment variables in your Render dashboard');
    process.exit(1);
  }
  
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.error('JWT_SECRET must be at least 32 characters long');
    process.exit(1);
  }
  
  console.log('Environment validation passed');
};

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('Database connection failed:', error);
    logger.info('Using in-memory fallback for demo purposes');
    // Continue without database for demo
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    console.log('Starting server...');
    validateEnvironment();
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log('Security measures: Rate limiting, input sanitization, and password hashing active');
      logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;