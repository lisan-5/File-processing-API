const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

class FileProcessingClient {
  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.apiURL = `${baseURL}/api`;
  }

  // Health check
  async checkHealth() {
    try {
      const response = await axios.get(`${this.apiURL}/health`);
      console.log('✅ Health check:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      throw error;
    }
  }

  // Upload files
  async uploadFiles(files, metadata = {}) {
    try {
      const formData = new FormData();
      
      // Add files
      files.forEach(filePath => {
        if (fs.existsSync(filePath)) {
          formData.append('files', fs.createReadStream(filePath));
        } else {
          console.warn(`⚠️ File not found: ${filePath}`);
        }
      });

      // Add metadata
      if (metadata.description) {
        formData.append('description', metadata.description);
      }
      if (metadata.tags && Array.isArray(metadata.tags)) {
        metadata.tags.forEach(tag => formData.append('tags[]', tag));
      }

      const response = await axios.post(`${this.apiURL}/files/upload`, formData, {
        headers: {
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      console.log('✅ Files uploaded successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ File upload failed:', error.message);
      throw error;
    }
  }

  // List all files
  async listFiles() {
    try {
      const response = await axios.get(`${this.apiURL}/files`);
      console.log('📁 Files list:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to list files:', error.message);
      throw error;
    }
  }

  // Get file info
  async getFileInfo(fileId) {
    try {
      const response = await axios.get(`${this.apiURL}/files/${fileId}`);
      console.log('📄 File info:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get file info:', error.message);
      throw error;
    }
  }

  // Process file
  async processFile(fileId, operation, options = {}) {
    try {
      const response = await axios.post(`${this.apiURL}/files/${fileId}/process`, {
        operation,
        options
      });
      console.log('🔧 File processed:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ File processing failed:', error.message);
      throw error;
    }
  }

  // Search files
  async searchFiles(criteria = {}) {
    try {
      const params = new URLSearchParams();
      Object.entries(criteria).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value);
        }
      });

      const response = await axios.get(`${this.apiURL}/files/search?${params.toString()}`);
      console.log('🔍 Search results:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ File search failed:', error.message);
      throw error;
    }
  }

  // Delete file
  async deleteFile(fileId) {
    try {
      const response = await axios.delete(`${this.apiURL}/files/${fileId}`);
      console.log('🗑️ File deleted:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ File deletion failed:', error.message);
      throw error;
    }
  }
}

// Example usage
async function main() {
  const client = new FileProcessingClient();

  try {
    // Check API health
    await client.checkHealth();

    // List files (should be empty initially)
    await client.listFiles();

    // Example: Upload some files (uncomment if you have test files)
    /*
    const uploadedFiles = await client.uploadFiles([
      './test-image.jpg',
      './test-document.pdf'
    ], {
      description: 'Test files for demonstration',
      tags: ['test', 'demo', 'example']
    });

    if (uploadedFiles.data && uploadedFiles.data.length > 0) {
      const firstFile = uploadedFiles.data[0];
      
      // Get file info
      await client.getFileInfo(firstFile.id);
      
      // Process file (if it's an image)
      if (firstFile.category === 'image') {
                await client.processFile(firstFile.id, 'resize', {
          width: 800,
          height: 600,
          quality: 85
        });
      }
      
      // Search for files
      await client.searchFiles({ type: 'image' });
      
      // Clean up - delete the file
      await client.deleteFile(firstFile.id);
    }
    */

    console.log('🎉 Example completed successfully!');
  } catch (error) {
    console.error('💥 Example failed:', error.message);
  }
}

// Run example if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = FileProcessingClient;
