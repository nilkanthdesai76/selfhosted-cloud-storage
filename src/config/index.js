import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET,
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
  },
  
  storage: {
    hotPath: process.env.HOT_STORAGE_PATH || './storage/hot',
    coldPath: process.env.COLD_STORAGE_PATH || './storage/cold',
    tempPath: process.env.TEMP_UPLOAD_PATH || './temp-uploads',
    numHotShards: parseInt(process.env.NUM_HOT_SHARDS) || 4,
    numColdShards: parseInt(process.env.NUM_COLD_SHARDS) || 2,
    coldThresholdDays: parseInt(process.env.COLD_DATA_THRESHOLD_DAYS) || 30,
  },
  
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 * 1024, // 5GB
    chunkSize: parseInt(process.env.CHUNK_SIZE) || 5 * 1024 * 1024, // 5MB
  },
  
  sharing: {
    defaultExpiryDays: parseInt(process.env.SHARE_LINK_EXPIRY_DAYS) || 7,
    maxDownloadsDefault: parseInt(process.env.MAX_DOWNLOADS_DEFAULT) || 10,
  },
  
  email: {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
  },
  
  appUrl: process.env.APP_URL || 'http://localhost:3000',
};
