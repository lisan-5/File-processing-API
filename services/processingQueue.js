const EventEmitter = require('events');
const logger = require('../middleware/logger');

class ProcessingQueue extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.processing = false;
    this.maxConcurrent = 2; // Process max 2 files at once
    this.activeJobs = 0;
  }

  addJob(job) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const jobWithId = {
      id: jobId,
      ...job,
      status: 'queued',
      createdAt: new Date(),
      priority: job.priority || 'normal'
    };

    this.queue.push(jobWithId);
    logger.info('Job added to queue', { jobId, type: job.type, priority: job.priority });
    
    this.emit('jobAdded', jobWithId);
    this.processNext();
    
    return jobId;
  }

  async processNext() {
    if (this.processing || this.activeJobs >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    
    // Sort by priority (high -> normal -> low)
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    while (this.queue.length > 0 && this.activeJobs < this.maxConcurrent) {
      const job = this.queue.shift();
      this.activeJobs++;
      
      logger.info('Starting job processing', { jobId: job.id, type: job.type });
      
      try {
        job.status = 'processing';
        job.startedAt = new Date();
        
        // Process the job
        const result = await this.executeJob(job);
        
        job.status = 'completed';
        job.completedAt = new Date();
        job.result = result;
        
        logger.info('Job completed successfully', { jobId: job.id, type: job.type });
        this.emit('jobCompleted', job);
        
      } catch (error) {
        job.status = 'failed';
        job.failedAt = new Date();
        job.error = error.message;
        
        logger.error('Job failed', { jobId: job.id, type: job.type, error: error.message });
        this.emit('jobFailed', job);
      } finally {
        this.activeJobs--;
      }
    }
    
    this.processing = false;
    
    if (this.queue.length > 0) {
      // Continue processing if there are more jobs
      setImmediate(() => this.processNext());
    }
  }

  async executeJob(job) {
    const { type, filePath, operation, options, processor } = job;
    
    switch (type) {
      case 'image':
        return await this.processImageJob(processor, filePath, operation, options);
      case 'document':
        return await this.processDocumentJob(processor, filePath, operation, options);
      case 'media':
        return await this.processMediaJob(processor, filePath, operation, options);
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  }

  async processImageJob(processor, filePath, operation, options) {
    switch (operation) {
      case 'resize':
        return await processor.resizeImage(filePath, options);
      case 'convert':
        return await processor.convertImage(filePath, options);
      case 'compress':
        return await processor.compressImage(filePath, options);
      default:
        throw new Error(`Unsupported image operation: ${operation}`);
    }
  }

  async processDocumentJob(processor, filePath, operation, options) {
    switch (operation) {
      case 'convert':
        return await processor.convertDocument(filePath, options.mimetype, options);
      case 'extract':
        return await processor.extractFileMetadata({ path: filePath, mimetype: options.mimetype });
      default:
        throw new Error(`Unsupported document operation: ${operation}`);
    }
  }

  async processMediaJob(processor, filePath, operation, options) {
    if (operation === 'extract') {
      return await processor.extractFileMetadata({ path: filePath, mimetype: options.mimetype });
    }
    throw new Error(`Unsupported media operation: ${operation}`);
  }

  getJobStatus(jobId) {
    const job = this.queue.find(j => j.id === jobId);
    if (!job) {
      // Check if it's a completed/failed job
      return { status: 'not_found' };
    }
    return {
      id: job.id,
      status: job.status,
      type: job.type,
      operation: job.operation,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      failedAt: job.failedAt,
      error: job.error,
      result: job.result
    };
  }

  getQueueStatus() {
    return {
      queued: this.queue.length,
      processing: this.activeJobs,
      total: this.queue.length + this.activeJobs,
      maxConcurrent: this.maxConcurrent
    };
  }

  clearQueue() {
    const clearedCount = this.queue.length;
    this.queue = [];
    logger.info('Queue cleared', { clearedCount });
    this.emit('queueCleared', clearedCount);
    return clearedCount;
  }

  removeJob(jobId) {
    const index = this.queue.findIndex(j => j.id === jobId);
    if (index !== -1) {
      const removedJob = this.queue.splice(index, 1)[0];
      logger.info('Job removed from queue', { jobId, type: removedJob.type });
      this.emit('jobRemoved', removedJob);
      return removedJob;
    }
    return null;
  }
}

module.exports = ProcessingQueue;
