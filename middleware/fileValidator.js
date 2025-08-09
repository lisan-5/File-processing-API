const path = require('path');
const fs = require('fs-extra');
const { logWarn, logError } = require('./logger');

// File type definitions with MIME types and extensions
const FILE_TYPES = {
  IMAGES: {
    mimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff'],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'],
    maxSize: 10 * 1024 * 1024 // 10MB
  },
  DOCUMENTS: {
    mimes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'text/html',
      'application/rtf'
    ],
    extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.html', '.rtf'],
    maxSize: 25 * 1024 * 1024 // 25MB
  },
  AUDIO: {
    mimes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac', 'audio/webm'],
    extensions: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm'],
    maxSize: 50 * 1024 * 1024 // 50MB
  },
  VIDEO: {
    mimes: ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-ms-wmv', 'video/webm', 'video/mpeg', 'video/x-msvideo'],
    extensions: ['.mp4', '.avi', '.mov', '.wmv', '.webm', '.mpeg', '.mpg'],
    maxSize: 200 * 1024 * 1024 // 200MB
  },
  ARCHIVES: {
    mimes: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/gzip', 'application/x-tar', 'application/x-bzip2'],
    extensions: ['.zip', '.rar', '.7z', '.gz', '.tar', '.bz2'],
    maxSize: 100 * 1024 * 1024 // 100MB
  }
};

// Dangerous file extensions that should be blocked
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar', '.msi',
  '.dll', '.sys', '.drv', '.ocx', '.cpl', '.hta', '.wsf', '.wsh', '.ps1', '.psm1'
];

// Dangerous MIME types
const DANGEROUS_MIMES = [
  'application/x-executable',
  'application/x-msdownload',
  'application/x-msi',
  'application/x-ms-shortcut',
  'application/x-ms-shortcut'
];

// Get file category based on MIME type
function getFileCategory(mimetype) {
  for (const [category, config] of Object.entries(FILE_TYPES)) {
    if (config.mimes.includes(mimetype)) {
      return category.toLowerCase();
    }
  }
  return 'unknown';
}

// Get file category based on extension
function getFileCategoryByExtension(filename) {
  const ext = path.extname(filename).toLowerCase();
  for (const [category, config] of Object.entries(FILE_TYPES)) {
    if (config.extensions.includes(ext)) {
      return category.toLowerCase();
    }
  }
  return 'unknown';
}

// Validate file extension
function validateFileExtension(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  // Check for dangerous extensions
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    throw new Error(`File extension '${ext}' is not allowed for security reasons`);
  }
  
  // Check if extension is supported
  const category = getFileCategoryByExtension(filename);
  if (category === 'unknown') {
    throw new Error(`File extension '${ext}' is not supported`);
  }
  
  return true;
}

// Validate MIME type
function validateMimeType(mimetype) {
  // Check for dangerous MIME types
  if (DANGEROUS_MIMES.includes(mimetype)) {
    throw new Error(`MIME type '${mimetype}' is not allowed for security reasons`);
  }
  
  // Check if MIME type is supported
  const category = getFileCategory(mimetype);
  if (category === 'unknown') {
    throw new Error(`MIME type '${mimetype}' is not supported`);
  }
  
  return true;
}

// Validate file size
function validateFileSize(size, mimetype) {
  const category = getFileCategory(mimetype);
  const maxSize = FILE_TYPES[category.toUpperCase()]?.maxSize || 10 * 1024 * 1024; // Default 10MB
  
  if (size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    const actualSizeMB = (size / (1024 * 1024)).toFixed(1);
    throw new Error(`File size ${actualSizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB for ${category} files`);
  }
  
  return true;
}

// Validate filename security
function validateFilename(filename) {
  // Check for null bytes
  if (filename.includes('\0')) {
    throw new Error('Filename contains null bytes');
  }
  
  // Check for path traversal attempts
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new Error('Filename contains invalid characters');
  }
  
  // Check for reserved names (Windows)
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  const nameWithoutExt = path.basename(filename, path.extname(filename)).toUpperCase();
  if (reservedNames.includes(nameWithoutExt)) {
    throw new Error('Filename is a reserved system name');
  }
  
  // Check filename length
  if (filename.length > 255) {
    throw new Error('Filename is too long (maximum 255 characters)');
  }
  
  return true;
}

// Simulate virus scanning (in production, integrate with real antivirus service)
async function scanForViruses(filePath) {
  try {
    // Simulate scanning delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check file size (very large files might be suspicious)
    const stats = await fs.stat(filePath);
    if (stats.size > 500 * 1024 * 1024) { // 500MB
      logWarn('Large file detected during virus scan', { filePath, size: stats.size });
    }
    
    // Check for suspicious patterns in binary files
    const buffer = await fs.readFile(filePath);
    const suspiciousPatterns = [
      Buffer.from('MZ'), // DOS executable
      Buffer.from('7F454C46'), // ELF executable
      Buffer.from('FEEDFACE'), // Mach-O executable
      Buffer.from('504B0304') // ZIP file
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (buffer.includes(pattern)) {
        logWarn('Suspicious file pattern detected', { filePath, pattern: pattern.toString('hex') });
      }
    }
    
    return { clean: true, message: 'File passed security scan' };
  } catch (error) {
    logError('Error during virus scan', error, { filePath });
    throw new Error('Failed to scan file for viruses');
  }
}

// Comprehensive file validation
async function validateFile(file, options = {}) {
  const validationErrors = [];
  
  try {
    // Basic validations
    validateFilename(file.originalname);
    validateFileExtension(file.originalname);
    validateMimeType(file.mimetype);
    validateFileSize(file.size, file.mimetype);
    
    // Additional security checks
    if (options.scanForViruses !== false) {
      await scanForViruses(file.path);
    }
    
    // Check file content vs MIME type mismatch
    const detectedCategory = getFileCategoryByExtension(file.originalname);
    const mimeCategory = getFileCategory(file.mimetype);
    
    if (detectedCategory !== 'unknown' && mimeCategory !== 'unknown' && detectedCategory !== mimeCategory) {
      logWarn('File extension and MIME type mismatch detected', {
        filename: file.originalname,
        extension: path.extname(file.originalname),
        mimetype: file.mimetype,
        detectedCategory,
        mimeCategory
      });
    }
    
    return {
      valid: true,
      category: mimeCategory,
      message: 'File validation passed'
    };
    
  } catch (error) {
    validationErrors.push(error.message);
    logError('File validation failed', error, {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    return {
      valid: false,
      errors: validationErrors,
      message: 'File validation failed'
    };
  }
}

// Format bytes to human readable format
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Get allowed file types for a specific category
function getAllowedFileTypes(category = null) {
  if (category) {
    const upperCategory = category.toUpperCase();
    return FILE_TYPES[upperCategory] || null;
  }
  return FILE_TYPES;
}

// Check if file type is allowed
function isFileTypeAllowed(filename, mimetype) {
  try {
    validateFileExtension(filename);
    validateMimeType(mimetype);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  FILE_TYPES,
  DANGEROUS_EXTENSIONS,
  DANGEROUS_MIMES,
  getFileCategory,
  getFileCategoryByExtension,
  validateFileExtension,
  validateMimeType,
  validateFileSize,
  validateFilename,
  scanForViruses,
  validateFile,
  formatBytes,
  getAllowedFileTypes,
  isFileTypeAllowed
};
