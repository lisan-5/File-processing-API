# File Processing API

A comprehensive file processing API built with Node.js and Express that provides file upload, download, processing, and management capabilities.

## 🚀 Features

- **File Upload & Management**: Support for multiple file types with validation
- **File Processing**: Image resizing, conversion, compression, and metadata extraction
- **Document Processing**: Convert between document formats (DOCX, PDF, Excel, Text)
- **Processing Queue**: Asynchronous file processing with priority management
- **Web Interface**: Beautiful, responsive dashboard for file management
- **Advanced Logging**: Structured logging with file rotation
- **Document Processing**: PDF text extraction, Word document parsing, Excel data extraction
- **Security**: File type validation, size limits, and security checks
- **Search & Filter**: Advanced file search with multiple criteria
- **Health Monitoring**: System health checks and monitoring
- **RESTful API**: Clean, well-documented REST endpoints

## 📋 Supported File Types

### Images
- JPEG, PNG, GIF, WebP, SVG
- Max size: 10MB

### Documents
- PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV
- Max size: 25MB

### Archives
- ZIP, RAR, 7Z, GZ, TAR
- Max size: 100MB

### Audio
- MP3, WAV, OGG, M4A
- Max size: 50MB

### Video
- MP4, AVI, MOV, WMV, WebM
- Max size: 200MB

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/lisan-5/File-processing-API.git
   cd file-processing-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

The API will be available at `http://localhost:3000`

## 📚 API Endpoints

### Health Check
- `GET /api/health` - Basic health status
- `GET /api/health/detailed` - Detailed system information

### File Management
- `GET /api/files` - List all files
- `POST /api/files/upload` - Upload files
- `GET /api/files/:fileId` - Get file information
- `GET /api/files/:fileId/download` - Download file
- `DELETE /api/files/:fileId` - Delete file

### File Processing
- `POST /api/files/:fileId/process` - Process file (resize, convert, compress, extract)

### Queue Management
- `GET /api/queue/status` - Get processing queue status
- `POST /api/queue/jobs` - Add a job to the processing queue
- `GET /api/queue/jobs/:jobId` - Get job status
- `DELETE /api/queue/jobs/:jobId` - Remove job from queue
- `DELETE /api/queue/jobs` - Clear entire queue
- `GET /api/queue/jobs` - Get all jobs

### File Search
- `GET /api/files/search` - Search files with filters

## 🔧 Usage Examples

### Upload Files
```bash
curl -X POST http://localhost:3000/api/files/upload \
  -F "files=@image.jpg" \
  -F "files=@document.pdf" \
  -F "description=Sample files" \
  -F "tags[]=sample" \
  -F "tags[]=test"
```

### Process Image
```bash
curl -X POST http://localhost:3000/api/files/{fileId}/process \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "resize",
    "options": {
      "width": 800,
      "height": 600,
      "quality": 85
    }
  }'
```

### Search Files
```bash
# Search by query
GET /api/files/search?query=report

# Filter by type
GET /api/files/search?type=document

# Filter by size
GET /api/files/search?size=gt:10MB

# Filter by date
GET /api/files/search?date=after:2024-01-01
```

## 🏗️ Project Structure

```
file-processing-api/
├── server.js                 # Main server file
├── package.json             # Dependencies and scripts
├── routes/                  # API route definitions
│   ├── fileRoutes.js       # File processing routes
│   └── healthRoutes.js     # Health check routes
├── middleware/              # Custom middleware
│   └── fileValidator.js    # File validation logic
├── services/                # Business logic
│   └── fileProcessor.js    # File processing service
├── uploads/                 # Uploaded files storage
├── data/                    # Metadata storage
└── README.md               # This file
```

## 🔒 Security Features

- **File Type Validation**: Strict MIME type and extension checking
- **Size Limits**: Configurable size limits per file category
- **Filename Security**: Protection against dangerous characters
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Configurable CORS settings
- **Helmet Security**: Security headers and protection

## 📊 File Processing Operations

### Image Processing
- **Resize**: Change dimensions while maintaining aspect ratio
- **Convert**: Convert between image formats (JPEG, PNG, WebP)
- **Compress**: Reduce file size with quality control

### Document Processing
- **PDF**: Extract text, page count, and metadata
- **Word**: Extract text content from DOC/DOCX files
- **Excel**: Extract sheet information and data structure

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch
```

## 🌍 Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## 📈 Performance

- **File Size Limits**: Configurable per file type
- **Batch Processing**: Support for multiple file uploads
- **Async Operations**: Non-blocking file processing
- **Memory Management**: Efficient file handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the existing issues
2. Create a new issue with detailed information
3. Include error logs and reproduction steps

## 🔄 Changelog

### v1.0.0
- Initial release
- File upload and management
- Image processing capabilities
- Document metadata extraction
- Search and filtering
- Health monitoring


