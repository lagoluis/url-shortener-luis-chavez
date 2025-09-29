import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error';
import linksRouter from './routes/links';
import redirectRouter from './routes/redirect';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.json({ ok: true });
});

// API routes
app.use('/api/v1/links', linksRouter);

// Redirect routes
app.use('/', redirectRouter);

// Not found handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
