import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri:
    process.env.MONGODB_URI ||
    (process.env.NODE_ENV === 'test'
      ? 'mongodb://127.0.0.1:27017/savewise_ai_test'
      : 'mongodb://127.0.0.1:27017/savewise_ai'),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'savewise_fallback_access_secret_key',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'savewise_fallback_refresh_secret_key',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
};
