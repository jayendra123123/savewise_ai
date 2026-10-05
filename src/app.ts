import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

export const createApp = (): Application => {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: '*', // Allow cross-platform mobile access and local dev
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use('/api', routes);

  // 404 Handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: `Endpoint not found: ${req.method} ${req.originalUrl}`
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
};
