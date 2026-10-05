"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectDB = exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const env_1 = require("./env");
const connectDB = async () => {
    try {
        await mongoose_1.default.connect(env_1.config.mongodbUri);
        console.log(`[MongoDB] Connected successfully to database: ${mongoose_1.default.connection.name}`);
    }
    catch (error) {
        console.error('[MongoDB] Connection error:', error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
const disconnectDB = async () => {
    try {
        await mongoose_1.default.disconnect();
        console.log('[MongoDB] Disconnected successfully');
    }
    catch (error) {
        console.error('[MongoDB] Disconnection error:', error);
    }
};
exports.disconnectDB = disconnectDB;
