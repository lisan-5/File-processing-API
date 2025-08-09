const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../middleware/logger');

class DatabaseService {
  constructor() {
    this.dataFile = path.join(__dirname, '../data/files.json');
    this.metadataFile = path.join(__dirname, '../data/metadata.json');
    this.queueFile = path.join(__dirname, '../data/queue.json');
    this.statsFile = path.join(__dirname, '../data/stats.json');
    
    this.initializeDataFiles();
  }

  // Initialize data files if they don't exist
  async initializeDataFiles() {
    try {
      await fs.ensureDir(path.dirname(this.dataFile));
      
      // Initialize all data files with default values
      await this.readDataFile(this.dataFile, []);
      await this.readDataFile(this.metadataFile, {});
      await this.readDataFile(this.queueFile, []);
      await this.readDataFile(this.statsFile, {
        totalFiles: 0,
        totalSize: 0,
        fileTypes: {},
        uploadsToday: 0,
        lastUpload: null
      });

      logger.info('Database service initialized successfully');
    } catch (error) {
      logger.error('Error initializing database service:', error);
    }
  }

  // Read data from file
  async readDataFile(filePath, defaultValue) {
    try {
      if (await fs.pathExists(filePath)) {
        const data = await fs.readJson(filePath);
        return data;
      }
      return defaultValue;
    } catch (error) {
      logger.error(`Error reading file ${filePath}:`, error);
      return defaultValue;
    }
  }

  // Write data to file
  async writeDataFile(filePath, data) {
    try {
      await fs.writeJson(filePath, data, { spaces: 2 });
      return true;
    } catch (error) {
      logger.error(`Error writing file ${filePath}:`, error);
      return false;
    }
  }

  // File operations
  async createFile(fileData) {
    try {
      const files = await this.readDataFile(this.dataFile, []);
      const newFile = {
        id: uuidv4(),
        ...fileData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      files.push(newFile);
      await this.writeDataFile(this.dataFile, files);
      
      // Update metadata
      await this.updateMetadata(newFile);
      
      // Update stats
      await this.updateStats(newFile, 'create');
      
      logger.info(`File created: ${newFile.id}`);
      return newFile;
    } catch (error) {
      logger.error('Error creating file:', error);
      throw error;
    }
  }

  async getFile(fileId) {
    try {
      const files = await this.readDataFile(this.dataFile, []);
      return files.find(file => file.id === fileId);
    } catch (error) {
      logger.error('Error getting file:', error);
      throw error;
    }
  }

  async getAllFiles(options = {}) {
    try {
      let files = await this.readDataFile(this.dataFile, []);
      
      // Apply filters
      if (options.category) {
        files = files.filter(file => file.category === options.category);
      }
      
      if (options.tags && options.tags.length > 0) {
        files = files.filter(file => 
          file.tags && options.tags.some(tag => file.tags.includes(tag))
        );
      }
      
      if (options.dateFrom) {
        files = files.filter(file => new Date(file.createdAt) >= new Date(options.dateFrom));
      }
      
      if (options.dateTo) {
        files = files.filter(file => new Date(file.createdAt) <= new Date(options.dateTo));
      }
      
      if (options.sizeMin) {
        files = files.filter(file => file.size >= options.sizeMin);
      }
      
      if (options.sizeMax) {
        files = files.filter(file => file.size <= options.sizeMax);
      }
      
      // Apply sorting
      if (options.sortBy) {
        const sortOrder = options.sortOrder === 'desc' ? -1 : 1;
        files.sort((a, b) => {
          if (a[options.sortBy] < b[options.sortBy]) return -1 * sortOrder;
          if (a[options.sortBy] > b[options.sortBy]) return 1 * sortOrder;
          return 0;
        });
      }
      
      // Apply pagination
      const page = options.page || 1;
      const limit = options.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const paginatedFiles = files.slice(startIndex, endIndex);
      const total = files.length;
      
      return {
        files: paginatedFiles,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting all files:', error);
      throw error;
    }
  }

  async updateFile(fileId, updateData) {
    try {
      const files = await this.readDataFile(this.dataFile, []);
      const fileIndex = files.findIndex(file => file.id === fileId);
      
      if (fileIndex === -1) {
        throw new Error('File not found');
      }
      
      files[fileIndex] = {
        ...files[fileIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      
      await this.writeDataFile(this.dataFile, files);
      
      logger.info(`File updated: ${fileId}`);
      return files[fileIndex];
    } catch (error) {
      logger.error('Error updating file:', error);
      throw error;
    }
  }

  async deleteFile(fileId) {
    try {
      const files = await this.readDataFile(this.dataFile, []);
      const fileIndex = files.findIndex(file => file.id === fileId);
      
      if (fileIndex === -1) {
        throw new Error('File not found');
      }
      
      const deletedFile = files[fileIndex];
      files.splice(fileIndex, 1);
      
      await this.writeDataFile(this.dataFile, files);
      
      // Update stats
      await this.updateStats(deletedFile, 'delete');
      
      logger.info(`File deleted: ${fileId}`);
      return deletedFile;
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw error;
    }
  }

  async searchFiles(query, options = {}) {
    try {
      const files = await this.readDataFile(this.dataFile, []);
      const searchResults = files.filter(file => {
        const searchableText = [
          file.originalName,
          file.description,
          file.tags?.join(' '),
          file.category,
          file.mimetype
        ].filter(Boolean).join(' ').toLowerCase();
        
        return searchableText.includes(query.toLowerCase());
      });
      
      // Apply additional filters and pagination
      const searchOptions = { ...options, page: 1, limit: 100 };
      const { files: filteredFiles, pagination } = await this.getAllFiles({
        ...searchOptions,
        files: searchResults
      });
      
      return {
        files: filteredFiles,
        pagination,
        query
      };
    } catch (error) {
      logger.error('Error searching files:', error);
      throw error;
    }
  }

  // Metadata operations
  async updateMetadata(fileData) {
    try {
      const metadata = await this.readDataFile(this.metadataFile, {});
      metadata[fileData.id] = {
        fileId: fileData.id,
        originalName: fileData.originalName,
        mimetype: fileData.mimetype,
        size: fileData.size,
        category: fileData.category,
        tags: fileData.tags || [],
        description: fileData.description,
        createdAt: fileData.createdAt,
        updatedAt: fileData.updatedAt
      };
      
      await this.writeDataFile(this.metadataFile, metadata);
    } catch (error) {
      logger.error('Error updating metadata:', error);
    }
  }

  // Stats operations
  async updateStats(fileData, operation) {
    try {
      const stats = await this.readDataFile(this.statsFile, {
        totalFiles: 0,
        totalSize: 0,
        fileTypes: {},
        uploadsToday: 0,
        lastUpload: null
      });
      
      if (operation === 'create') {
        stats.totalFiles++;
        stats.totalSize += fileData.size;
        stats.fileTypes[fileData.mimetype] = (stats.fileTypes[fileData.mimetype] || 0) + 1;
        stats.lastUpload = new Date().toISOString();
        
        // Check if upload is today
        const today = new Date().toDateString();
        const uploadDate = new Date(fileData.createdAt).toDateString();
        if (uploadDate === today) {
          stats.uploadsToday++;
        }
      } else if (operation === 'delete') {
        stats.totalFiles = Math.max(0, stats.totalFiles - 1);
        stats.totalSize = Math.max(0, stats.totalSize - fileData.size);
        stats.fileTypes[fileData.mimetype] = Math.max(0, (stats.fileTypes[fileData.mimetype] || 1) - 1);
      }
      
      await this.writeDataFile(this.statsFile, stats);
    } catch (error) {
      logger.error('Error updating stats:', error);
    }
  }

  async getStats() {
    try {
      return await this.readDataFile(this.statsFile, {
        totalFiles: 0,
        totalSize: 0,
        fileTypes: {},
        uploadsToday: 0,
        lastUpload: null
      });
    } catch (error) {
      logger.error('Error getting stats:', error);
      throw error;
    }
  }

  // Queue operations
  async addToQueue(jobData) {
    try {
      const queue = await this.readDataFile(this.queueFile, []);
      const newJob = {
        id: uuidv4(),
        ...jobData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      queue.push(newJob);
      await this.writeDataFile(this.queueFile, queue);
      
      logger.info(`Job added to queue: ${newJob.id}`);
      return newJob;
    } catch (error) {
      logger.error('Error adding job to queue:', error);
      throw error;
    }
  }

  async getQueueStatus() {
    try {
      const queue = await this.readDataFile(this.queueFile, []);
      const stats = {
        total: queue.length,
        pending: queue.filter(job => job.status === 'pending').length,
        processing: queue.filter(job => job.status === 'processing').length,
        completed: queue.filter(job => job.status === 'completed').length,
        failed: queue.filter(job => job.status === 'failed').length
      };
      
      return stats;
    } catch (error) {
      logger.error('Error getting queue status:', error);
      throw error;
    }
  }
}

module.exports = DatabaseService;
