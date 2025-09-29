import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { join } from 'path';
import { beforeAll, afterAll } from 'vitest';
import { unlinkSync } from 'fs';

// Use a test-specific database
const testDbPath = join(__dirname, '../test.db');
process.env.DATABASE_URL = `file:${testDbPath}`;

export const prismaTest = new PrismaClient({
  datasources: {
    db: {
      url: `file:${testDbPath}`
    }
  }
});

let isSetup = false;

// Global setup that runs once before all tests
beforeAll(async () => {
  if (isSetup) return;
  
  try {
    // Remove existing test database
    try {
      unlinkSync(testDbPath);
    } catch (err) {
      // Ignore if file doesn't exist
    }

    // Run migrations to create the test database schema
    execSync('npx prisma migrate deploy', { 
      cwd: join(__dirname, '..'),
      env: { ...process.env, DATABASE_URL: `file:${testDbPath}` },
      stdio: 'pipe'
    });
    
    // Ensure prisma client is connected
    await prismaTest.$connect();
    isSetup = true;
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
});

// Global teardown that runs once after all tests
afterAll(async () => {
  try {
    await prismaTest.$disconnect();
    
    // Clean up test database file
    try {
      unlinkSync(testDbPath);
    } catch (err) {
      // Ignore if file doesn't exist
    }
  } catch (error) {
    console.error('Failed to teardown test database:', error);
  }
});

// Setup function to run before all tests in a suite
export async function setupTestDatabase() {
  // No-op, global setup handles this
}

// Cleanup function to run after each test
export async function cleanupTestDatabase() {
  try {
    // Clean all data between tests
    await prismaTest.click.deleteMany({});
    await prismaTest.link.deleteMany({});
  } catch (error) {
    console.error('Failed to cleanup test database:', error);
    throw error;
  }
}

// Teardown function to run after all tests in a suite
export async function teardownTestDatabase() {
  // No-op since global teardown handles disconnection
}
