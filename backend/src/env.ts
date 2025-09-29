import dotenv from 'dotenv';

// Load environment variables from .env file if not in production
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

export const Env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '3000',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db'
} as const;

// Basic validation
if (!Env.PORT || isNaN(Number(Env.PORT))) {
  throw new Error('Invalid PORT environment variable');
}

if (!Env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}
