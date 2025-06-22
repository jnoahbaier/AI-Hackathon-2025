const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const dreamRoutes = require('./routes/dreams');
const healthRoutes = require('./routes/health');
const testRoutes = require('./routes/test');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploaded audio files and frontend)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Serve generated images
app.use('/images', express.static('generated_images'));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/dreams', dreamRoutes);
app.use('/api/test', testRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large',
      message: 'Audio file size exceeds the maximum allowed limit'
    });
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.listen(PORT, () => {
  console.log(`🚀 Dream Recorder Backend running on port ${PORT}`);
  console.log(`📁 Upload directory: ${uploadDir}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}); 