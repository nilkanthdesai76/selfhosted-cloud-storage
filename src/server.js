import express from 'express';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { storageService } from './services/storage.js';
import { startColdStorageScheduler } from './workers/coldStorage.worker.js';
import { startTrashCleanupScheduler } from './workers/trashCleanup.worker.js';
import authRoutes from './routes/auth.js';
import authEnhancedRoutes from './routes/auth-enhanced.js';
import fileRoutes from './routes/files.js';
import shareRoutes from './routes/shares.js';
import folderRoutes from './routes/folders.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow inline scripts for simplicity
}));
app.use(cors());
app.use(express.json());
app.use(fileUpload({
  limits: { fileSize: config.upload.maxFileSize },
  useTempFiles: true,
  tempFileDir: config.storage.tempPath,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use('/api/', limiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', authEnhancedRoutes); // Enhanced auth with OTP
app.use('/api/files', fileRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/folders', folderRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve landing page as home
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/landing.html'));
});

// Serve index.html for auth routes
app.get('/signin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve static files (after routes)
app.use(express.static(path.join(__dirname, '../public')));

// Initialize storage
await storageService.initialize();

// Start background workers
if (config.nodeEnv !== 'test') {
  startColdStorageScheduler();
  startTrashCleanupScheduler();
}

// Start server
app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});
