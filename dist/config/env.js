"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
exports.config = {
    port: parseInt(process.env.PORT || '5000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    mongodbUri: process.env.MONGODB_URI ||
        (process.env.NODE_ENV === 'test'
            ? 'mongodb://127.0.0.1:27017/savewise_ai_test'
            : 'mongodb://127.0.0.1:27017/savewise_ai'),
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'savewise_fallback_access_secret_key',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'savewise_fallback_refresh_secret_key',
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '7d',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    twelveDataApiKey: process.env.TWELVE_DATA_API_KEY || '',
    goldApiKey: process.env.GOLD_API_KEY || '',
    twelveDataDailyLimit: parseInt(process.env.TWELVE_DATA_DAILY_LIMIT || '700', 10),
    smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
    smtpSecure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    smtpFrom: process.env.SMTP_FROM || '',
};
