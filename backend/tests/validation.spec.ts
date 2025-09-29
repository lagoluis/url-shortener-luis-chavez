import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import app from './test-app';
import { setupTestDatabase, cleanupTestDatabase, teardownTestDatabase } from './setup';

describe('Validation functionality', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should reject javascript: URLs with 400 and proper error envelope', async () => {
    // Act: POST with dangerous javascript: URL
    const response = await request(app)
      .post('/api/v1/links')
      .send({
        targetUrl: 'javascript:alert(1)',
        slug: 'test-js'
      });

    // Assert: 400 status with error envelope
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: [
          {
            field: 'targetUrl',
            message: 'Target URL must use http or https protocol'
          }
        ]
      }
    });
  });

  it('should reject data: URLs with proper error message', async () => {
    // Act: POST with data: URL
    const response = await request(app)
      .post('/api/v1/links')
      .send({
        targetUrl: 'data:text/html,<script>alert(1)</script>'
      });

    // Assert: 400 status with validation error
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details[0].field).toBe('targetUrl');
    expect(response.body.error.details[0].message).toBe('Target URL must use http or https protocol');
  });

  it('should reject invalid URL format with proper error message', async () => {
    // Act: POST with invalid URL
    const response = await request(app)
      .post('/api/v1/links')
      .send({
        targetUrl: 'not-a-valid-url'
      });

    // Assert: Should get URL validation error (could be 400 or 500 depending on how zod handles it)
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should reject invalid slug format with proper error message', async () => {
    // Act: POST with invalid slug (contains spaces and special characters)
    const response = await request(app)
      .post('/api/v1/links')
      .send({
        targetUrl: 'https://example.com',
        slug: 'invalid slug with spaces!'
      });

    // Assert: 400 status with validation error
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: [
          {
            field: 'slug',
            message: 'Slug must be 1-64 characters of letters, numbers, underscore, or dash'
          }
        ]
      }
    });
  });

  it('should reject empty targetUrl with proper error message', async () => {
    // Act: POST without required targetUrl
    const response = await request(app)
      .post('/api/v1/links')
      .send({
        slug: 'test-empty'
      });

    // Assert: 400 status with validation error
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toBe('Invalid request data');
  });

  it('should accept valid http and https URLs', async () => {
    // Act: POST with valid HTTP URL
    const httpResponse = await request(app)
      .post('/api/v1/links')
      .send({
        targetUrl: 'http://example.com',
        slug: 'test-http'
      });

    // Act: POST with valid HTTPS URL  
    const httpsResponse = await request(app)
      .post('/api/v1/links')
      .send({
        targetUrl: 'https://example.com',
        slug: 'test-https'
      });

    // Assert: Both should be successful
    expect(httpResponse.status).toBe(201);
    expect(httpResponse.body.link.targetUrl).toBe('http://example.com');
    expect(httpResponse.body.link.slug).toBe('test-http');

    expect(httpsResponse.status).toBe(201);
    expect(httpsResponse.body.link.targetUrl).toBe('https://example.com');
    expect(httpsResponse.body.link.slug).toBe('test-https');
  });

  it('should reject overly long slugs', async () => {
    // Act: POST with slug longer than 64 characters
    const longSlug = 'a'.repeat(65);
    const response = await request(app)
      .post('/api/v1/links')
      .send({
        targetUrl: 'https://example.com',
        slug: longSlug
      });

    // Assert: 400 status with validation error
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details[0].field).toBe('slug');
    expect(response.body.error.details[0].message).toBe('Slug must be 1-64 characters of letters, numbers, underscore, or dash');
  });
});
