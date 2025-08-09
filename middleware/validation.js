const Joi = require('joi');
const { APIError } = require('./errorHandler');

// Validation schemas
const schemas = {
  // File upload validation
  uploadFiles: Joi.object({
    description: Joi.string().max(500).optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    category: Joi.string().valid('images', 'documents', 'audio', 'video', 'archives').optional(),
    metadata: Joi.object().optional()
  }),

  // File processing validation
  processFile: Joi.object({
    operations: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('resize', 'convert', 'compress', 'extract', 'rotate', 'crop').required(),
        options: Joi.object().required()
      })
    ).min(1).max(10).required(),
    outputFormat: Joi.string().optional(),
    quality: Joi.number().min(1).max(100).optional()
  }),

  // Search validation
  searchFiles: Joi.object({
    query: Joi.string().min(1).max(100).required(),
    category: Joi.string().valid('images', 'documents', 'audio', 'video', 'archives').optional(),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().optional(),
    sizeMin: Joi.number().positive().optional(),
    sizeMax: Joi.number().positive().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    page: Joi.number().integer().min(1).default(1)
  }),

  // Queue job validation
  createJob: Joi.object({
    fileId: Joi.string().required(),
    priority: Joi.number().integer().min(1).max(10).default(5),
    operations: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('resize', 'convert', 'compress', 'extract', 'rotate', 'crop').required(),
        options: Joi.object().required()
      })
    ).min(1).max(10).required(),
    callbackUrl: Joi.string().uri().optional(),
    metadata: Joi.object().optional()
  })
};

// Validation middleware factory
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      return next(new APIError(`Validation schema '${schemaName}' not found`, 500));
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');
      
      return next(new APIError(`Validation error: ${errorMessage}`, 400));
    }

    // Replace req.body with validated data
    req.body = value;
    next();
  };
};

// File type validation
const validateFileType = (allowedTypes) => {
  return (req, res, next) => {
    if (!req.files || req.files.length === 0) {
      return next(new APIError('No files uploaded', 400));
    }

    const invalidFiles = req.files.filter(file => {
      return !allowedTypes.includes(file.mimetype);
    });

    if (invalidFiles.length > 0) {
      const invalidTypes = invalidFiles.map(f => f.mimetype).join(', ');
      return next(new APIError(`Invalid file types: ${invalidTypes}`, 400));
    }

    next();
  };
};

// File size validation
const validateFileSize = (maxSize) => {
  return (req, res, next) => {
    if (!req.files || req.files.length === 0) {
      return next(new APIError('No files uploaded', 400));
    }

    const oversizedFiles = req.files.filter(file => {
      return file.size > maxSize;
    });

    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(f => f.originalname).join(', ');
      return next(new APIError(`Files too large: ${fileNames}`, 400));
    }

    next();
  };
};

module.exports = {
  validate,
  validateFileType,
  validateFileSize,
  schemas
};
