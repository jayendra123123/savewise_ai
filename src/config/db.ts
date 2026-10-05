import mongoose from 'mongoose';
import { config } from './env';

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log(`[MongoDB] Connected successfully to database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('[MongoDB] Connection error:', error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected successfully');
  } catch (error) {
    console.error('[MongoDB] Disconnection error:', error);
  }
};
