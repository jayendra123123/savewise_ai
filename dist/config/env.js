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
    mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/savewise_ai',
    jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'savewise_fallback_access_secret_key',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'savewise_fallback_refresh_secret_key',
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
};
