const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Initialize database & run migrations/seeding
const { db, initSchema } = require('./src/db/database');
const { seedDatabase } = require('./src/db/seed');

initSchema();
seedDatabase();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload directory exists (compatible with Vercel serverless /tmp)
const isVercel = process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
const uploadDir = isVercel ? path.join('/tmp', 'uploads') : path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    console.warn('Could not create upload directory:', err.message);
  }
}

// Multer storage configuration for asset images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `asset-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  }
});

// Serve uploaded images (including /tmp uploads on Vercel)
if (isVercel) {
  app.use('/uploads', express.static(uploadDir));
}

// Image Upload Endpoint
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No image file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl });
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Attach optional authentication context
const { optionalAuth } = require('./src/middleware/auth');
app.use('/api', optionalAuth);

// API Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/assets', require('./src/routes/assets'));
app.use('/api/allocations', require('./src/routes/allocations'));
app.use('/api/maintenance', require('./src/routes/maintenance'));
app.use('/api/employees', require('./src/routes/employees'));
app.use('/api/reports', require('./src/routes/reports'));
app.use('/api/audit', require('./src/routes/audit'));

// SPA Fallback for any client side navigation
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'public/index.html'));
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`Office Asset Management System running successfully!`);
    console.log(`Local Access: http://localhost:${PORT}`);
    console.log(`Database: SQLite (WAL Mode active)`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('====================================================');
  });
}

module.exports = app;
