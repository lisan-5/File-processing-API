const request = require('supertest');
const path = require('path');
const fs = require('fs-extra');
const app = require('../server');

// Test configuration
const TEST_UPLOADS_DIR = path.join(__dirname, '../test-uploads');
const TEST_DATA_DIR = path.join(__dirname, '../test-data');

// Test data
const testFiles = {
  image: {
    path: path.join(__dirname, 'fixtures/test-image.jpg'),
    mimetype: 'image/jpeg',
    originalname: 'test-image.jpg'
  },
  document: {
    path: path.join(__dirname, 'fixtures/test-document.pdf'),
    mimetype: 'application/pdf',
    originalname: 'test-document.pdf'
  }
};

// Setup and teardown
beforeAll(async () => {
  // Create test directories
  await fs.ensureDir(TEST_UPLOADS_DIR);
  await fs.ensureDir(TEST_DATA_DIR);
  
  // Create test files if they don't exist
  await createTestFiles();
});

afterAll(async () => {
  // Clean up test directories
  await fs.remove(TEST_UPLOADS_DIR);
  await fs.remove(TEST_DATA_DIR);
});

// Helper function to create test files
async function createTestFiles() {
  // Create a simple test image (1x1 pixel JPEG)
  const testImageBuffer = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
    0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
    0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
    0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
    0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x8A, 0x20,
    0x00, 0xFF, 0xD9
  ]);
  
  await fs.writeFile(testFiles.image.path, testImageBuffer);
  
  // Create a simple test PDF
  const testPdfBuffer = Buffer.from([
    0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, 0x25, 0xC7, 0xEC,
    0x8F, 0xA2, 0x0A, 0x31, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, 0x0A, 0x3C,
    0x3C, 0x2F, 0x54, 0x79, 0x70, 0x65, 0x2F, 0x43, 0x61, 0x74, 0x61, 0x6C,
    0x6F, 0x67, 0x2F, 0x50, 0x61, 0x67, 0x65, 0x73, 0x20, 0x32, 0x20, 0x30,
    0x20, 0x52, 0x3E, 0x3E, 0x0A, 0x65, 0x6E, 0x64, 0x6F, 0x62, 0x6A, 0x0A,
    0x32, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, 0x0A, 0x3C, 0x3C, 0x2F, 0x54,
    0x79, 0x70, 0x65, 0x2F, 0x50, 0x61, 0x67, 0x65, 0x2F, 0x50, 0x61, 0x72,
    0x65, 0x6E, 0x74, 0x20, 0x33, 0x20, 0x30, 0x20, 0x52, 0x2F, 0x4D, 0x65,
    0x64, 0x69, 0x61, 0x42, 0x6F, 0x78, 0x5B, 0x30, 0x20, 0x30, 0x20, 0x36,
    0x31, 0x32, 0x20, 0x37, 0x39, 0x32, 0x5D, 0x2F, 0x43, 0x6F, 0x6E, 0x74,
    0x65, 0x6E, 0x74, 0x73, 0x20, 0x34, 0x20, 0x30, 0x20, 0x52, 0x2F, 0x52,
    0x65, 0x73, 0x6F, 0x75, 0x72, 0x63, 0x65, 0x73, 0x3E, 0x3E, 0x0A, 0x65,
    0x6E, 0x64, 0x6F, 0x62, 0x6A, 0x0A, 0x33, 0x20, 0x30, 0x20, 0x6F, 0x62,
    0x6A, 0x0A, 0x3C, 0x3C, 0x2F, 0x54, 0x79, 0x70, 0x65, 0x2F, 0x50, 0x61,
    0x67, 0x65, 0x73, 0x2F, 0x43, 0x6F, 0x75, 0x6E, 0x74, 0x20, 0x31, 0x2F,
    0x4B, 0x69, 0x64, 0x73, 0x5B, 0x32, 0x20, 0x30, 0x20, 0x52, 0x5D, 0x3E,
    0x3E, 0x0A, 0x65, 0x6E, 0x64, 0x6F, 0x62, 0x6A, 0x0A, 0x34, 0x20, 0x30,
    0x20, 0x6F, 0x62, 0x6A, 0x0A, 0x3C, 0x3C, 0x2F, 0x4C, 0x65, 0x6E, 0x67,
    0x74, 0x68, 0x20, 0x35, 0x20, 0x30, 0x20, 0x52, 0x3E, 0x3E, 0x0A, 0x73,
    0x74, 0x72, 0x65, 0x61, 0x6D, 0x0A, 0x42, 0x54, 0x0A, 0x35, 0x30, 0x20,
    0x35, 0x30, 0x20, 0x54, 0x44, 0x0A, 0x2F, 0x46, 0x31, 0x20, 0x31, 0x32,
    0x20, 0x54, 0x66, 0x0A, 0x28, 0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x20, 0x57,
    0x6F, 0x72, 0x6C, 0x64, 0x29, 0x20, 0x54, 0x6A, 0x0A, 0x45, 0x54, 0x0A,
    0x65, 0x6E, 0x64, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6D, 0x0A, 0x65, 0x6E,
    0x64, 0x6F, 0x62, 0x6A, 0x0A, 0x35, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A,
    0x0A, 0x3C, 0x3C, 0x2F, 0x54, 0x79, 0x70, 0x65, 0x2F, 0x46, 0x6F, 0x6E,
    0x74, 0x2F, 0x53, 0x75, 0x62, 0x74, 0x79, 0x70, 0x65, 0x2F, 0x54, 0x79,
    0x70, 0x65, 0x31, 0x2F, 0x42, 0x61, 0x73, 0x65, 0x46, 0x6F, 0x6E, 0x74,
    0x2F, 0x46, 0x6F, 0x6E, 0x74, 0x44, 0x65, 0x73, 0x63, 0x72, 0x69, 0x70,
    0x74, 0x6F, 0x72, 0x2F, 0x46, 0x6F, 0x6E, 0x74, 0x42, 0x61, 0x73, 0x65,
    0x2F, 0x48, 0x65, 0x6C, 0x76, 0x65, 0x74, 0x69, 0x63, 0x61, 0x3E, 0x3E,
    0x0A, 0x65, 0x6E, 0x64, 0x6F, 0x62, 0x6A, 0x0A, 0x78, 0x72, 0x65, 0x66,
    0x0A, 0x30, 0x20, 0x36, 0x0A, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30,
    0x30, 0x30, 0x30, 0x20, 0x36, 0x35, 0x35, 0x33, 0x35, 0x20, 0x66, 0x0A,
    0x0A, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20,
    0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x6E, 0x0A,
    0x0A, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20,
    0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x6E, 0x0A,
    0x0A, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20,
    0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x6E, 0x0A,
    0x0A, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20,
    0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x6E, 0x0A,
    0x0A, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20,
    0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x6E, 0x0A,
    0x0A, 0x74, 0x72, 0x61, 0x69, 0x6C, 0x65, 0x72, 0x0A, 0x3C, 0x3C, 0x2F,
    0x53, 0x69, 0x7A, 0x65, 0x20, 0x36, 0x2F, 0x52, 0x6F, 0x6F, 0x74, 0x20,
    0x31, 0x20, 0x30, 0x20, 0x52, 0x2F, 0x49, 0x6E, 0x66, 0x6F, 0x20, 0x37,
    0x20, 0x30, 0x20, 0x52, 0x3E, 0x3E, 0x0A, 0x73, 0x74, 0x61, 0x72, 0x74,
    0x78, 0x72, 0x65, 0x66, 0x0A, 0x31, 0x32, 0x37, 0x0A, 0x25, 0x25, 0x45,
    0x4F, 0x46, 0x0A
  ]);
  
  await fs.writeFile(testFiles.document.path, testPdfBuffer);
}

// Test suites
describe('API Endpoints', () => {
  describe('Health Check', () => {
    test('GET /api/health should return 200', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('GET /api/health/detailed should return detailed health info', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('environment');
    });
  });

  describe('File Upload', () => {
    test('POST /api/files/upload should upload a valid image file', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .attach('files', testFiles.image.path)
        .field('description', 'Test image upload')
        .field('tags[]', 'test')
        .field('tags[]', 'image')
        .expect(201);
      
      expect(response.body).toHaveProperty('message', 'Files uploaded successfully');
      expect(response.body).toHaveProperty('files');
      expect(Array.isArray(response.body.files)).toBe(true);
      expect(response.body.files.length).toBeGreaterThan(0);
      
      const uploadedFile = response.body.files[0];
      expect(uploadedFile).toHaveProperty('id');
      expect(uploadedFile).toHaveProperty('originalName', 'test-image.jpg');
      expect(uploadedFile).toHaveProperty('mimetype', 'image/jpeg');
      expect(uploadedFile).toHaveProperty('category', 'images');
    });

    test('POST /api/files/upload should reject invalid file types', async () => {
      const invalidFile = Buffer.from('This is not a valid file');
      
      const response = await request(app)
        .post('/api/files/upload')
        .attach('files', invalidFile, 'test.exe')
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });

    test('POST /api/files/upload should reject files that are too large', async () => {
      // Create a large file (exceeds limits)
      const largeFile = Buffer.alloc(30 * 1024 * 1024); // 30MB
      
      const response = await request(app)
        .post('/api/files/upload')
        .attach('files', largeFile, 'large-file.txt')
        .expect(413);
      
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('File Management', () => {
    let uploadedFileId;

    beforeAll(async () => {
      // Upload a test file for these tests
      const response = await request(app)
        .post('/api/files/upload')
        .attach('files', testFiles.image.path)
        .field('description', 'Test file for management tests');
      
      uploadedFileId = response.body.files[0].id;
    });

    test('GET /api/files should return list of files', async () => {
      const response = await request(app)
        .get('/api/files')
        .expect(200);
      
      expect(response.body).toHaveProperty('files');
      expect(Array.isArray(response.body.files)).toBe(true);
    });

    test('GET /api/files/:fileId should return file information', async () => {
      const response = await request(app)
        .get(`/api/files/${uploadedFileId}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('id', uploadedFileId);
      expect(response.body).toHaveProperty('originalName');
      expect(response.body).toHaveProperty('mimetype');
      expect(response.body).toHaveProperty('size');
    });

    test('GET /api/files/:fileId/download should allow file download', async () => {
      const response = await request(app)
        .get(`/api/files/${uploadedFileId}/download`)
        .expect(200);
      
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    test('DELETE /api/files/:fileId should delete a file', async () => {
      const response = await request(app)
        .delete(`/api/files/${uploadedFileId}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'File deleted successfully');
    });
  });

  describe('File Processing', () => {
    let uploadedFileId;

    beforeAll(async () => {
      // Upload a test file for processing tests
      const response = await request(app)
        .post('/api/files/upload')
        .attach('files', testFiles.image.path)
        .field('description', 'Test file for processing');
      
      uploadedFileId = response.body.files[0].id;
    });

    test('POST /api/files/:fileId/process should process an image file', async () => {
      const response = await request(app)
        .post(`/api/files/${uploadedFileId}/process`)
        .send({
          operation: 'resize',
          options: {
            width: 800,
            height: 600,
            quality: 85
          }
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'File processed successfully');
      expect(response.body).toHaveProperty('processedFile');
    });

    test('POST /api/files/:fileId/process should reject invalid operations', async () => {
      const response = await request(app)
        .post(`/api/files/${uploadedFileId}/process`)
        .send({
          operation: 'invalid_operation',
          options: {}
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('File Search', () => {
    test('GET /api/files/search should search files by query', async () => {
      const response = await request(app)
        .get('/api/files/search?query=test')
        .expect(200);
      
      expect(response.body).toHaveProperty('files');
      expect(Array.isArray(response.body.files)).toBe(true);
    });

    test('GET /api/files/search should filter by file type', async () => {
      const response = await request(app)
        .get('/api/files/search?type=images')
        .expect(200);
      
      expect(response.body).toHaveProperty('files');
      expect(Array.isArray(response.body.files)).toBe(true);
    });
  });

  describe('Queue Management', () => {
    test('GET /api/queue/status should return queue status', async () => {
      const response = await request(app)
        .get('/api/queue/status')
        .expect(200);
      
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('jobCount');
    });
  });

  describe('Error Handling', () => {
    test('Should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);
      
      expect(response.body).toHaveProperty('error', 'Endpoint not found');
    });

    test('Should return 400 for invalid JSON', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
  });
});

// Performance tests
describe('Performance Tests', () => {
  test('Health check should respond within 100ms', async () => {
    const start = Date.now();
    
    await request(app)
      .get('/api/health')
      .expect(200);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });

  test('File list should respond within 500ms', async () => {
    const start = Date.now();
    
    await request(app)
      .get('/api/files')
      .expect(200);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });
});

// Security tests
describe('Security Tests', () => {
  test('Should reject files with dangerous extensions', async () => {
    const dangerousFile = Buffer.from('malicious content');
    
    const response = await request(app)
      .post('/api/files/upload')
      .attach('files', dangerousFile, 'malicious.exe')
      .expect(400);
    
    expect(response.body).toHaveProperty('error');
  });

  test('Should reject files with path traversal attempts', async () => {
    const testFile = Buffer.from('test content');
    
    const response = await request(app)
      .post('/api/files/upload')
      .attach('files', testFile, '../../../etc/passwd')
      .expect(400);
    
    expect(response.body).toHaveProperty('error');
  });

  test('Should reject files that are too large', async () => {
    const largeFile = Buffer.alloc(30 * 1024 * 1024); // 30MB
    
    const response = await request(app)
      .post('/api/files/upload')
      .attach('files', largeFile, 'large-file.txt')
      .expect(413);
    
    expect(response.body).toHaveProperty('error');
  });
});
