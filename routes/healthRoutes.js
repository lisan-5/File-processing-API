const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const ResponseHelper = require('../middleware/responseHelper');
const DatabaseService = require('../services/databaseService');
const logger = require('../middleware/logger');

const router = express.Router();
const databaseService = new DatabaseService();

// Helper function to get directory size
async function getDirectorySize(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    let totalSize = 0;
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);
      if (stats.isFile()) {
        totalSize += stats.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    logger.error('Error calculating directory size:', error);
    return 0;
  }
}

// Helper function to get file count
async function getFileCount(dirPath) {
  try {
    const files = await fs.readdir(dirPath);
    let count = 0;
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);
      if (stats.isFile()) {
        count++;
      }
    }
    
    return count;
  } catch (error) {
    logger.error('Error counting files:', error);
    return 0;
  }
}

// Basic health check
router.get('/', (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };
  
  ResponseHelper.success(res, healthData, 'Service is healthy');
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '../uploads');
    
    // Check if uploads directory exists
    const dirExists = await fs.pathExists(uploadsDir);
    if (!dirExists) {
      return ResponseHelper.internalError(res, 'Uploads directory does not exist');
    }

    const stats = await fs.stat(uploadsDir);
    if (!stats.isDirectory()) {
      return ResponseHelper.internalError(res, 'Uploads path is not a directory');
    }

    // Get system information
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      cpu: os.cpus().length,
      loadAverage: os.loadavg()
    };

    // Get storage information
    const storageInfo = {
      uploadsDirectory: uploadsDir,
      exists: true,
      stats: {
        size: await getDirectorySize(uploadsDir),
        fileCount: await getFileCount(uploadsDir)
      }
    };

    // Get database stats
    const dbStats = await databaseService.getStats();

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      system: systemInfo,
      storage: storageInfo,
      database: dbStats
    };

    ResponseHelper.success(res, healthData, 'Detailed health check completed');
  } catch (error) {
    logger.error('Error in detailed health check:', error);
    ResponseHelper.internalError(res, 'Health check failed', error.message);
  }
});

module.exports = router;
