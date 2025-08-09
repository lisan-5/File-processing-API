const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs-extra');
const compression = require('compression');
const hpp = require('hpp');

// Import configuration
const CONFIG = require('./config');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

// Import routes
const fileRoutes = require('./routes/fileRoutes');
const healthRoutes = require('./routes/healthRoutes');
const queueRoutes = require('./routes/queueRoutes');

const app = express();
const PORT = CONFIG.PORT;

// Initialize directories
function initializeDirectories() {
  try {
    fs.ensureDirSync(CONFIG.UPLOADS.DIRECTORY);
    fs.ensureDirSync(path.join(__dirname, 'public'));
    fs.ensureDirSync(path.join(__dirname, 'logs'));
    fs.ensureDirSync(path.join(__dirname, 'data'));
  } catch (error) {
    logger.error('Error creating directories:', error);
    process.exit(1);
  }
}

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\''],
      scriptSrc: ['\'self\''],
      imgSrc: ['\'self\'', 'data:', 'blob:']
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: CONFIG.CORS.ORIGINS,
  credentials: CONFIG.CORS.CREDENTIALS,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting with different limits for different endpoints
const generalLimiter = rateLimit({
  windowMs: CONFIG.RATE_LIMIT.WINDOW_MS,
  max: CONFIG.RATE_LIMIT.MAX_REQUESTS,
  message: CONFIG.RATE_LIMIT.MESSAGE,
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit uploads to 20 per 15 minutes
  message: 'Too many upload requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/files/upload', uploadLimiter);

// Body parsing middleware with security
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      throw new Error('Invalid JSON');
    }
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 100
}));

// Security middleware
app.use(hpp()); // Protect against HTTP Parameter Pollution
app.use(compression()); // Enable gzip compression

// Enhanced logging middleware
const morganFormat = CONFIG.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
  stream: {
    write: (message) => {
      logger.info(message.trim());
      // In production, you might want to write to a file
      if (CONFIG.NODE_ENV === 'production') {
        fs.appendFileSync(path.join(__dirname, 'logs', 'access.log'), message);
      }
    }
  }
}));

// Static files with security headers
app.use('/uploads', express.static(CONFIG.UPLOADS.DIRECTORY, {
  setHeaders: (res, _path) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
  }
}));
app.use('/', express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, _path) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
  }
}));

// API routes
app.use('/api/files', fileRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/queue', queueRoutes);

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'File Processing API',
    version: '1.0.0',
    environment: CONFIG.NODE_ENV,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      files: '/api/files',
      upload: '/api/files/upload',
      process: '/api/files/process',
      download: '/api/files/download/:filename',
      queue: '/api/queue'
    },
    documentation: '/api/docs'
  });
});

// Root endpoint - serve the HTML dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Use the centralized error handler
app.use(errorHandler);

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server function
function startServer() {
  try {
    const server = app.listen(PORT, () => {
      logger.info(`🚀 File Processing API server running on port ${PORT}`);
      logger.info(`📁 Uploads directory: ${CONFIG.UPLOADS.DIRECTORY}`);
      logger.info(`🌐 API available at: http://localhost:${PORT}/api`);
      logger.info(`📊 Dashboard available at: http://localhost:${PORT}`);
      logger.info(`🔒 Environment: ${CONFIG.NODE_ENV}`);
      logger.info(`📝 Log level: ${CONFIG.LOGGING.LEVEL}`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      switch (error.code) {
        case 'EACCES':
          logger.error(`Port ${PORT} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`Port ${PORT} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Initialize and start server if this file is run directly
if (require.main === module) {
  initializeDirectories();
  startServer();
}

module.exports = app;
