const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const { getFileCategory, formatBytes } = require('../middleware/fileValidator');
const logger = require('../middleware/logger');

class FileProcessor {
  constructor() {
    this.uploadsDir = path.join(__dirname, '../uploads');
    this.metadataFile = path.join(__dirname, '../data/file-metadata.json');
    this.ensureDataDirectory();
  }

  // Ensure data directory exists
  async ensureDataDirectory() {
    try {
      await fs.ensureDir(path.dirname(this.metadataFile));
      if (!await fs.pathExists(this.metadataFile)) {
        await fs.writeJson(this.metadataFile, {});
      }
    } catch (error) {
      logger.error('Error ensuring data directory:', error);
    }
  }

  // Process uploaded files
  async processUploadedFiles(files, metadata = {}) {
    const processedFiles = [];
    
    for (const file of files) {
      try {
        const fileInfo = await this.createFileInfo(file, metadata);
        await this.saveFileMetadata(fileInfo);
        processedFiles.push(fileInfo);
      } catch (error) {
        logger.error(`Error processing file ${file.originalname}:`, error);
        throw error;
      }
    }
    
    return processedFiles;
  }

  // Create file information object
  async createFileInfo(file, metadata = {}) {
    const fileId = path.basename(file.filename, path.extname(file.filename));
    const fileCategory = getFileCategory(file.mimetype);
    
    const fileInfo = {
      id: fileId,
      originalName: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      sizeFormatted: formatBytes(file.size),
      category: fileCategory,
      path: file.path,
      uploadDate: new Date().toISOString(),
      description: metadata.description || '',
      tags: metadata.tags || [],
      metadata: await this.extractFileMetadata(file),
      processingHistory: []
    };

    return fileInfo;
  }

  // Extract file metadata based on type
  async extractFileMetadata(file) {
    try {
      const category = getFileCategory(file.mimetype);
      
      switch (category) {
        case 'image':
          return await this.extractImageMetadata(file.path);
        case 'document':
          return await this.extractDocumentMetadata(file.path, file.mimetype);
        case 'audio':
        case 'video':
          return await this.extractMediaMetadata(file.path);
        default:
          return { type: 'unknown' };
      }
    } catch (error) {
      logger.error('Error extracting metadata:', error);
      return { error: error.message };
    }
  }

  // Extract image metadata
  async extractImageMetadata(filePath) {
    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();
      
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasProfile: metadata.hasProfile,
        hasAlpha: metadata.hasAlpha
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  // Extract document metadata
  async extractDocumentMetadata(filePath, mimetype) {
    try {
      if (mimetype === 'application/pdf') {
        const dataBuffer = await fs.readFile(filePath);
        const data = await pdfParse(dataBuffer);
        
        return {
          pages: data.numpages,
          text: `${data.text.substring(0, 500)}...`,
          info: data.info
        };
      } else if (mimetype.includes('wordprocessingml.document')) {
        const result = await mammoth.extractRawText({ path: filePath });
        return {
          text: `${result.value.substring(0, 500)}...`,
          messages: result.messages
        };
      } else if (mimetype.includes('spreadsheetml.sheet')) {
        // Add security measures for xlsx processing
        const options = {
          cellDates: false,
          cellNF: false,
          cellStyles: false,
          cellText: false,
          cellHTML: false,
          cellFormula: false,
          cellFormulaArray: false
        };
        
        const workbook = XLSX.readFile(filePath, options);
        const sheetNames = workbook.SheetNames;
        const firstSheet = workbook.Sheets[sheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
        
        return {
          sheets: sheetNames,
          rows: data.length,
          columns: data[0] ? data[0].length : 0
        };
      } else {
        return { type: 'document' };
      }
    } catch (error) {
      return { error: error.message };
    }
  }

  // Extract media metadata
  async extractMediaMetadata(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        type: 'media',
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  // Save file metadata to JSON file
  async saveFileMetadata(fileInfo) {
    try {
      const metadata = await this.loadFileMetadata();
      metadata[fileInfo.id] = fileInfo;
      await fs.writeJson(this.metadataFile, metadata, { spaces: 2 });
    } catch (error) {
      logger.error('Error saving file metadata:', error);
      throw error;
    }
  }

  // Load file metadata from JSON file
  async loadFileMetadata() {
    try {
      if (await fs.pathExists(this.metadataFile)) {
        return await fs.readJson(this.metadataFile);
      }
      return {};
    } catch (error) {
      logger.error('Error loading file metadata:', error);
      return {};
    }
  }

  // List all files
  async listFiles() {
    try {
      const metadata = await this.loadFileMetadata();
      return Object.values(metadata).sort((a, b) => 
        new Date(b.uploadDate) - new Date(a.uploadDate)
      );
    } catch (error) {
      logger.error('Error listing files:', error);
      throw error;
    }
  }

  // Get file info by ID
  async getFileInfo(fileId) {
    try {
      const metadata = await this.loadFileMetadata();
      return metadata[fileId] || null;
    } catch (error) {
      logger.error('Error getting file info:', error);
      throw error;
    }
  }

  // Get file path by ID
  async getFilePath(fileId) {
    try {
      const fileInfo = await this.getFileInfo(fileId);
      if (!fileInfo) return null;
      
      const filePath = path.join(this.uploadsDir, fileInfo.filename);
      if (await fs.pathExists(filePath)) {
        return filePath;
      }
      return null;
    } catch (error) {
      logger.error('Error getting file path:', error);
      throw error;
    }
  }

  // Process file (convert, resize, etc.)
  async processFile(fileId, operation, options = {}) {
    try {
      const fileInfo = await this.getFileInfo(fileId);
      if (!fileInfo) {
        throw new Error('File not found');
      }

      const filePath = await this.getFilePath(fileId);
      if (!filePath) {
        throw new Error('File not accessible');
      }

      let result;
      
      // Handle operations based on file category
      if (fileInfo.category === 'image') {
        switch (operation) {
          case 'resize':
            result = await this.resizeImage(filePath, options);
            break;
          case 'convert':
            result = await this.convertImage(filePath, options);
            break;
          case 'compress':
            result = await this.compressImage(filePath, options);
            break;
          default:
            throw new Error(`Unsupported image operation: ${operation}`);
        }
      } else if (fileInfo.category === 'document') {
        switch (operation) {
          case 'convert':
            result = await this.convertDocument(filePath, fileInfo.mimetype, options);
            break;
          case 'extract':
            result = await this.extractFileMetadata({ path: filePath, mimetype: fileInfo.mimetype });
            break;
          default:
            throw new Error(`Unsupported document operation: ${operation}`);
        }
      } else if (fileInfo.category === 'media') {
        switch (operation) {
          case 'extract':
            result = await this.extractFileMetadata({ path: filePath, mimetype: fileInfo.mimetype });
            break;
          default:
            throw new Error(`Unsupported media operation: ${operation}`);
        }
      } else {
        // For other file types, only allow metadata extraction
        if (operation === 'extract') {
          result = await this.extractFileMetadata({ path: filePath, mimetype: fileInfo.mimetype });
        } else {
          throw new Error(`Unsupported operation for file type ${fileInfo.category}: ${operation}`);
        }
      }

      // Update processing history
      fileInfo.processingHistory.push({
        operation,
        options,
        result,
        timestamp: new Date().toISOString()
      });

      await this.saveFileMetadata(fileInfo);

      return result;
    } catch (error) {
      logger.error('Error processing file:', error);
      throw error;
    }
  }

  // Resize image
  async resizeImage(filePath, options = {}) {
    try {
      const { width, height, quality = 80 } = options;
      const outputPath = filePath.replace(/\.[^/.]+$/, '_resized.jpg');
      
      const image = sharp(filePath);
      if (width && height) {
        image.resize(width, height);
      } else if (width) {
        image.resize(width);
      } else if (height) {
        image.resize(null, height);
      }
      
      await image.jpeg({ quality }).toFile(outputPath);
      
      return {
        originalPath: filePath,
        outputPath,
        dimensions: { width, height },
        quality
      };
    } catch (error) {
      throw new Error(`Image resize failed: ${error.message}`);
    }
  }

  // Convert image format
  async convertImage(filePath, options = {}) {
    try {
      const { format = 'jpeg', quality = 80 } = options;
      const outputPath = filePath.replace(/\.[^/.]+$/, `.${format}`);
      
      const image = sharp(filePath);
      await image[format]({ quality }).toFile(outputPath);
      
      return {
        originalPath: filePath,
        outputPath,
        format,
        quality
      };
    } catch (error) {
      throw new Error(`Image conversion failed: ${error.message}`);
    }
  }

  // Compress image
  async compressImage(filePath, options = {}) {
    try {
      const { quality = 60 } = options;
      const outputPath = filePath.replace(/\.[^/.]+$/, '_compressed.jpg');
      
      await sharp(filePath)
        .jpeg({ quality })
        .toFile(outputPath);
      
      const originalStats = await fs.stat(filePath);
      const compressedStats = await fs.stat(outputPath);
      
      return {
        originalPath: filePath,
        outputPath,
        originalSize: originalStats.size,
        compressedSize: compressedStats.size,
        compressionRatio: `${((originalStats.size - compressedStats.size) / originalStats.size * 100).toFixed(2)}%`,
        quality
      };
    } catch (error) {
      throw new Error(`Image compression failed: ${error.message}`);
    }
  }

  // Convert document
  async convertDocument(filePath, mimetype, options = {}) {
    try {
      const { format = 'html' } = options;
      const outputPath = filePath.replace(/\.[^/.]+$/, `.${format}`);
      
      let result;
      
      if (mimetype.includes('wordprocessingml.document') || mimetype.includes('vnd.openxmlformats-officedocument.wordprocessingml')) {
        // Convert DOCX to HTML
        const buffer = await fs.readFile(filePath);
        result = await mammoth.convertToHtml({ buffer });
        
        await fs.writeFile(outputPath, result.value);
        
        return {
          originalPath: filePath,
          outputPath,
          format: 'html',
          message: 'DOCX converted to HTML successfully'
        };
      } else if (mimetype.includes('pdf')) {
        // Convert PDF to text
        const buffer = await fs.readFile(filePath);
        const data = await pdfParse(buffer);
        
        await fs.writeFile(outputPath, data.text);
        
        return {
          originalPath: filePath,
          outputPath,
          format: 'txt',
          message: 'PDF converted to text successfully'
        };
      } else if (mimetype.includes('spreadsheetml.sheet')) {
        // Convert Excel to CSV
        const workbook = XLSX.readFile(filePath, {
          cellDates: false,
          cellNF: false,
          cellStyles: false,
          cellText: false,
          cellHTML: false,
          cellFormula: false,
          cellFormulaArray: false
        });
        
        const sheetNames = workbook.SheetNames;
        const firstSheet = workbook.Sheets[sheetNames[0]];
        const csvData = XLSX.utils.sheet_to_csv(firstSheet);
        
        await fs.writeFile(outputPath, csvData);
        
        return {
          originalPath: filePath,
          outputPath,
          format: 'csv',
          message: 'Excel converted to CSV successfully'
        };
      } else if (mimetype.includes('text/plain')) {
        // Convert text to HTML
        const content = await fs.readFile(filePath, 'utf8');
        const htmlContent = `<html><head><title>Converted Text</title></head><body><pre>${content}</pre></body></html>`;
        
        await fs.writeFile(outputPath, htmlContent);
        
        return {
          originalPath: filePath,
          outputPath,
          format: 'html',
          message: 'Text converted to HTML successfully'
        };
      } else {
        throw new Error(`Unsupported document format for conversion: ${mimetype}`);
      }
    } catch (error) {
      throw new Error(`Document conversion failed: ${error.message}`);
    }
  }

  // Delete file
  async deleteFile(fileId) {
    try {
      const fileInfo = await this.getFileInfo(fileId);
      if (!fileInfo) {
        return false;
      }

      // Delete physical file
      const filePath = path.join(this.uploadsDir, fileInfo.filename);
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
      }

      // Remove from metadata
      const metadata = await this.loadFileMetadata();
      delete metadata[fileId];
      await fs.writeJson(this.metadataFile, metadata, { spaces: 2 });

      return true;
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw error;
    }
  }

  // Search files
  async searchFiles(criteria = {}) {
    try {
      const { query, type, size, date } = criteria;
      let files = await this.listFiles();

      // Filter by query (search in filename, description, tags)
      if (query) {
        const searchTerm = query.toLowerCase();
        files = files.filter(file => 
          file.originalName.toLowerCase().includes(searchTerm) ||
          file.description.toLowerCase().includes(searchTerm) ||
          file.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }

      // Filter by type
      if (type) {
        files = files.filter(file => file.category === type);
      }

      // Filter by size
      if (size) {
        const [operator, value] = size.split(':');
        const sizeInBytes = this.parseSizeString(value);
        
        switch (operator) {
          case 'gt':
            files = files.filter(file => file.size > sizeInBytes);
            break;
          case 'lt':
            files = files.filter(file => file.size < sizeInBytes);
            break;
          case 'eq':
            files = files.filter(file => file.size === sizeInBytes);
            break;
        }
      }

      // Filter by date
      if (date) {
        const [operator, dateValue] = date.split(':');
        const targetDate = new Date(dateValue);
        
        switch (operator) {
          case 'after':
            files = files.filter(file => new Date(file.uploadDate) > targetDate);
            break;
          case 'before':
            files = files.filter(file => new Date(file.uploadDate) < targetDate);
            break;
          case 'on':
            files = files.filter(file => {
              const fileDate = new Date(file.uploadDate);
              return fileDate.toDateString() === targetDate.toDateString();
            });
            break;
        }
      }

      return files;
    } catch (error) {
      logger.error('Error searching files:', error);
      throw error;
    }
  }

  // Parse size string (e.g., "10MB", "1GB")
  parseSizeString(sizeStr) {
    const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
    
    if (match) {
      const [, value, unit] = match;
      return parseFloat(value) * units[unit.toUpperCase()];
    }
    
    return parseInt(sizeStr) || 0;
  }
}

module.exports = new FileProcessor();
