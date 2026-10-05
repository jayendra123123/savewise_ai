import { createApp } from './app';
import { config } from './config/env';
import { connectDB } from './config/db';

const startServer = async (): Promise<void> => {
  await connectDB();

  const app = createApp();
  const PORT = config.port;

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`🚀 SaveWise AI Backend running at http://localhost:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`===============================================`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Fatal startup error:', err);
    process.exit(1);
  });
}
