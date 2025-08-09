const express = require('express');
const router = express.Router();
const ProcessingQueue = require('../services/processingQueue');
const fileProcessor = require('../services/fileProcessor');
const ResponseHelper = require('../middleware/responseHelper');
const DatabaseService = require('../services/databaseService');
const logger = require('../middleware/logger');

// Initialize queue and processor
const processingQueue = new ProcessingQueue();
const databaseService = new DatabaseService();

// Get queue status
router.get('/status', (req, res) => {
  try {
    const status = processingQueue.getQueueStatus();
    ResponseHelper.success(res, status, 'Queue status retrieved successfully');
  } catch (error) {
    logger.error('Failed to get queue status', { error: error.message });
    ResponseHelper.internalError(res, 'Failed to get queue status', error.message);
  }
});

// Add job to queue
router.post('/jobs', async (req, res) => {
  try {
    const { fileId, operation, options = {}, priority = 'normal' } = req.body;

    // Validate required fields
    if (!fileId || !operation) {
      return ResponseHelper.badRequest(res, 'fileId and operation are required');
    }

    // Validate priority
    if (!['low', 'normal', 'high'].includes(priority)) {
      return ResponseHelper.badRequest(res, 'Invalid priority. Must be low, normal, or high');
    }

    // Get file info
    const fileInfo = await databaseService.getFile(fileId);
    if (!fileInfo) {
      return ResponseHelper.notFound(res, 'File not found');
    }

    const filePath = fileInfo.path;
    if (!filePath) {
      return ResponseHelper.notFound(res, 'File path not found');
    }
    
    // Add job to queue
    const jobId = processingQueue.addJob({
      type: fileInfo.category,
      filePath,
      operation,
      options: { ...options, mimetype: fileInfo.mimetype },
      processor: fileProcessor,
      priority
    });

    // Add to database queue
    await databaseService.addToQueue({
      fileId,
      operation,
      options,
      priority,
      status: 'pending'
    });

    logger.info('Job added to queue', { jobId, fileId, operation, priority });

    ResponseHelper.created(res, {
      jobId,
      status: 'queued',
      fileId,
      operation,
      priority
    }, 'Job added to queue successfully');
  } catch (error) {
    logger.error('Failed to add job to queue', { error: error.message });
    ResponseHelper.internalError(res, 'Failed to add job to queue', error.message);
  }
});

// Get job status
router.get('/jobs/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const status = processingQueue.getJobStatus(jobId);
    
    if (!status) {
      return ResponseHelper.notFound(res, 'Job not found');
    }
    
    ResponseHelper.success(res, status, 'Job status retrieved successfully');
  } catch (error) {
    logger.error('Failed to get job status', { error: error.message });
    ResponseHelper.internalError(res, 'Failed to get job status', error.message);
  }
});

// Remove job from queue
router.delete('/jobs/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const removedJob = processingQueue.removeJob(jobId);
    
    if (!removedJob) {
      return ResponseHelper.notFound(res, 'Job not found');
    }

    ResponseHelper.success(res, {
      message: 'Job removed from queue',
      jobId,
      type: removedJob.type
    }, 'Job removed successfully');
  } catch (error) {
    logger.error('Failed to remove job from queue', { error: error.message });
    ResponseHelper.internalError(res, 'Failed to remove job from queue', error.message);
  }
});

// Clear entire queue
router.delete('/jobs', (req, res) => {
  try {
    const clearedCount = processingQueue.clearQueue();
    
    ResponseHelper.success(res, {
      message: 'Queue cleared successfully',
      clearedCount
    }, 'Queue cleared successfully');
  } catch (error) {
    logger.error('Failed to clear queue', { error: error.message });
    ResponseHelper.internalError(res, 'Failed to clear queue', error.message);
  }
});

// Get all jobs (queued, processing, completed, failed)
router.get('/jobs', (req, res) => {
  try {
    // This would need to be enhanced to track completed/failed jobs
    // For now, just return queue status
    const queueStatus = processingQueue.getQueueStatus();
    
    ResponseHelper.success(res, {
      queue: queueStatus,
      message: 'Queue status retrieved successfully'
    }, 'Jobs retrieved successfully');
  } catch (error) {
    logger.error('Failed to get jobs', { error: error.message });
    ResponseHelper.internalError(res, 'Failed to get jobs', error.message);
  }
});

module.exports = router;
