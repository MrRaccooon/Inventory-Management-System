/**
 * Express application setup.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const v1Routes = require('./routes/v1');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.cors.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request logging
if (config.app.debug) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing
app.use(express.json({ limit: config.fileUpload.maxUploadSize }));
app.use(express.urlencoded({ extended: true, limit: config.fileUpload.maxUploadSize }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    app: config.app.name,
    version: config.app.version,
    timestamp: new Date().toISOString(),
  });
});

// API root endpoint
app.get('/', (req, res) => {
  res.json({
    message: `Welcome to ${config.app.name} API`,
    version: config.app.version,
    docs: '/api/v1/docs',
  });
});

// API routes
app.use('/api/v1', v1Routes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

module.exports = app;

