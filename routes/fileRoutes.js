const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const fileProcessor = require('../services/fileProcessor');
const fileValidator = require('../middleware/fileValidator');
const ResponseHelper = require('../middleware/responseHelper');
const DatabaseService = require('../services/databaseService');

const router = express.Router();
const databaseService = new DatabaseService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Max 10 files per request
  },
  fileFilter: fileValidator.validateFileType
});

// Validation middleware
const uploadValidation = [
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be a string with maximum 500 characters'),
  body('tags')
    .optional()
    .custom((value, { req }) => {
      try {
        // Handle both array and JSON string formats
        let tags = value;
        if (typeof value === 'string') {
          tags = JSON.parse(value);
        }
        
        if (!Array.isArray(tags)) {
          throw new Error('Tags must be an array');
        }
        
        if (tags.length > 10) {
          throw new Error('Maximum 10 tags allowed');
        }
        
        // Update req.body.tags with parsed array
        req.body.tags = tags;
        return true;
      } catch (error) {
        throw new Error('Invalid tags format');
      }
    })
];

const processValidation = [
  body('operation')
    .isIn(['convert', 'extract', 'resize', 'compress'])
    .withMessage('Invalid operation. Must be one of: convert, extract, resize, compress'),
  body('options')
    .optional()
    .isObject()
    .withMessage('Options must be a valid object')
];

// Get all uploaded files
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, tags, dateFrom, dateTo, sizeMin, sizeMax, sortBy, sortOrder } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      tags: tags ? tags.split(',') : undefined,
      dateFrom,
      dateTo,
      sizeMin: sizeMin ? parseInt(sizeMin) : undefined,
      sizeMax: sizeMax ? parseInt(sizeMax) : undefined,
      sortBy,
      sortOrder
    };

    const result = await databaseService.getAllFiles(options);
    ResponseHelper.success(res, result, 'Files retrieved successfully');
  } catch (error) {
    ResponseHelper.internalError(res, 'Failed to retrieve files', error.message);
  }
});

// Upload files
router.post('/upload', 
  upload.array('files', 10),
  uploadValidation,
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseHelper.badRequest(res, 'Validation failed', errors.array());
      }

      if (!req.files || req.files.length === 0) {
        return ResponseHelper.badRequest(res, 'No files uploaded');
      }

      const uploadedFiles = [];
      
      for (const file of req.files) {
        const fileData = {
          originalName: file.originalname,
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
          description: req.body.description || '',
          tags: req.body.tags || [],
          category: fileValidator.getFileCategory(file.mimetype)
        };

        const savedFile = await databaseService.createFile(fileData);
        uploadedFiles.push(savedFile);
      }
      
      ResponseHelper.created(res, uploadedFiles, `Successfully uploaded ${uploadedFiles.length} file(s)`);
    } catch (error) {
      ResponseHelper.internalError(res, 'Failed to upload files', error.message);
    }
  }
);

// Search files
router.get('/search', async (req, res) => {
  try {
    const { query, page = 1, limit = 20 } = req.query;
    
    if (!query) {
      return ResponseHelper.badRequest(res, 'Search query is required');
    }

    const options = { page: parseInt(page), limit: parseInt(limit) };
    const results = await databaseService.searchFiles(query, options);
    
    ResponseHelper.success(res, results, 'Search completed successfully');
  } catch (error) {
    ResponseHelper.internalError(res, 'Failed to search files', error.message);
  }
});

// Get file info by ID
router.get('/:fileId', async (req, res) => {
  try {
    const fileInfo = await databaseService.getFile(req.params.fileId);
    if (!fileInfo) {
      return ResponseHelper.notFound(res, 'File not found');
    }
    
    ResponseHelper.success(res, fileInfo, 'File information retrieved successfully');
  } catch (error) {
    ResponseHelper.internalError(res, 'Failed to retrieve file information', error.message);
  }
});

// Download file
router.get('/:fileId/download', async (req, res) => {
  try {
    const fileInfo = await databaseService.getFile(req.params.fileId);
    if (!fileInfo) {
      return ResponseHelper.notFound(res, 'File not found');
    }

    const filePath = fileInfo.path;
    if (!fs.existsSync(filePath)) {
      return ResponseHelper.notFound(res, 'File not found on disk');
    }

    const fileName = fileInfo.originalName;
    res.download(filePath, fileName);
  } catch (error) {
    ResponseHelper.internalError(res, 'Failed to download file', error.message);
  }
});

// Process file (convert, extract metadata, etc.)
router.post('/:fileId/process', 
  processValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ResponseHelper.badRequest(res, 'Validation failed', errors.array());
      }

      const fileInfo = await databaseService.getFile(req.params.fileId);
      if (!fileInfo) {
        return ResponseHelper.notFound(res, 'File not found');
      }

      const { operation, options } = req.body;
      const result = await fileProcessor.processFile(req.params.fileId, operation, options);
      
      ResponseHelper.success(res, result, `File processed successfully with operation: ${operation}`);
    } catch (error) {
      ResponseHelper.internalError(res, 'Failed to process file', error.message);
    }
  }
);

// Delete file
router.delete('/:fileId', async (req, res) => {
  try {
    const fileInfo = await databaseService.getFile(req.params.fileId);
    if (!fileInfo) {
      return ResponseHelper.notFound(res, 'File not found');
    }

    // Delete from disk
    if (fs.existsSync(fileInfo.path)) {
      fs.unlinkSync(fileInfo.path);
    }

    // Delete from database
    await databaseService.deleteFile(req.params.fileId);
    
    ResponseHelper.success(res, { fileId: req.params.fileId }, 'File deleted successfully');
  } catch (error) {
    ResponseHelper.internalError(res, 'Failed to delete file', error.message);
  }
});

module.exports = router;
