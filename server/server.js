const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const plantRoutes = require('./routes/plantRoutes');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ========== SECURITY MIDDLEWARE ==========

// Helmet — secure HTTP headers (relaxed CSP for images from Cloudinary)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com', 'blob:'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'"],
    },
  },
}));

// Compression — gzip responses
app.use(compression());

// Rate limiting — prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // stricter for auth endpoints
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later.' },
});

// ========== CORE MIDDLEWARE ==========

// CORS — allow frontend in dev, same-origin in production
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  // In production, frontend is served from same origin — no CORS needed
  app.use(cors());
} else {
  app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========== API ROUTES ==========
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/plants', apiLimiter, plantRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '🌱 Plant Tracker API is running' });
});

// ========== SERVE FRONTEND IN PRODUCTION ==========
if (isProduction) {
  // Serve React build
  app.use(express.static(path.join(__dirname, '../client/dist')));

  // Any route that isn't an API route → serve React app
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client', 'dist', 'index.html'));
  });
}

// ========== ERROR HANDLING ==========
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err instanceof require('multer').MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: err.message || 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🌱 Plant Tracker Server running on port ${PORT} [${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
});
