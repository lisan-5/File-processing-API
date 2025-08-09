// Configuration file for File Processing API
module.exports = {
  // Server Configuration
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Security Configuration
  CORS: {
    ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    CREDENTIALS: true
  },
  
  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100, // limit each IP to 100 requests per window
    MESSAGE: 'Too many requests from this IP, please try again later.'
  },
  
  // File Upload Configuration
  UPLOADS: {
    DIRECTORY: process.env.UPLOADS_DIR || './uploads',
    MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || '100MB',
    ALLOWED_TYPES: {
      IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
      DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv'],
      AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'],
      VIDEO: ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-ms-wmv', 'video/webm'],
      ARCHIVES: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/gzip', 'application/x-tar']
    },
    SIZE_LIMITS: {
      IMAGES: 10 * 1024 * 1024, // 10MB
      DOCUMENTS: 25 * 1024 * 1024, // 25MB
      AUDIO: 50 * 1024 * 1024, // 50MB
      VIDEO: 200 * 1024 * 1024, // 200MB
      ARCHIVES: 100 * 1024 * 1024 // 100MB
    }
  },
  
  // Database Configuration (for future use)
  DATABASE: {
    URL: process.env.DATABASE_URL || 'mongodb://localhost:27017/file-processing-api',
    OPTIONS: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  
  // Redis Configuration (for queue management)
  REDIS: {
    HOST: process.env.REDIS_HOST || 'localhost',
    PORT: process.env.REDIS_PORT || 6379,
    PASSWORD: process.env.REDIS_PASSWORD || null,
    DB: process.env.REDIS_DB || 0
  },
  
  // Logging Configuration
  LOGGING: {
    LEVEL: process.env.LOG_LEVEL || 'info',
    FILE: process.env.LOG_FILE || './logs/app.log',
    MAX_SIZE: process.env.LOG_MAX_SIZE || '10m',
    MAX_FILES: process.env.LOG_MAX_FILES || 5
  },
  
  // JWT Configuration (for future authentication)
  JWT: {
    SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  // External Services
  SERVICES: {
    IMAGE_PROCESSING: {
      ENABLED: process.env.ENABLE_IMAGE_PROCESSING !== 'false',
      MAX_DIMENSIONS: {
        WIDTH: parseInt(process.env.MAX_IMAGE_WIDTH) || 4000,
        HEIGHT: parseInt(process.env.MAX_IMAGE_HEIGHT) || 4000
      }
    },
    DOCUMENT_PROCESSING: {
      ENABLED: process.env.ENABLE_DOCUMENT_PROCESSING !== 'false',
      MAX_PAGES: parseInt(process.env.MAX_DOCUMENT_PAGES) || 1000
    }
  }
};
