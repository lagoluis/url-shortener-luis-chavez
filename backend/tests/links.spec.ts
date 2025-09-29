import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import app from './test-app';
import { setupTestDatabase, cleanupTestDatabase, teardownTestDatabase, prismaTest } from './setup';

describe('Links API functionality', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should return correct shape for GET /api/v1/links', async () => {
    // Arrange: Create test links with deterministic data and explicit timestamps
    const baseDate = new Date('2024-01-01T00:00:00.000Z');
    
    // Create links with explicit timestamps to ensure predictable sorting
    await prismaTest.link.create({
      data: {
        slug: 'test-link-1',
        targetUrl: 'https://example.com/page1',
        createdAt: new Date(baseDate.getTime() + 1000) // 1 second after base
      }
    });
    
    await prismaTest.link.create({
      data: {
        slug: 'test-link-2',
        targetUrl: 'https://example.com/page2',
        createdAt: new Date(baseDate.getTime() + 2000) // 2 seconds after base
      }
    });
    
    await prismaTest.link.create({
      data: {
        slug: 'test-link-3',
        targetUrl: 'https://example.com/page3',
        createdAt: new Date(baseDate.getTime() + 3000) // 3 seconds after base (newest)
      }
    });

    // Act: Request links list
    const response = await request(app)
      .get('/api/v1/links');

    // Assert: Check response structure and content
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('links');
    expect(Array.isArray(response.body.links)).toBe(true);
    expect(response.body.links).toHaveLength(3);

    // Check that links are sorted by createdAt desc (newest first)
    const links = response.body.links;
    expect(links[0].slug).toBe('test-link-3'); // Newest should be first
    expect(links[1].slug).toBe('test-link-2');
    expect(links[2].slug).toBe('test-link-1'); // Oldest should be last

    // Verify each link has the correct shape
    for (const link of links) {
      expect(link).toHaveProperty('id');
      expect(link).toHaveProperty('slug');
      expect(link).toHaveProperty('targetUrl');
      expect(link).toHaveProperty('createdAt');
      
      // Verify types
      expect(typeof link.id).toBe('string');
      expect(typeof link.slug).toBe('string');
      expect(typeof link.targetUrl).toBe('string');
      expect(typeof link.createdAt).toBe('string');
      
      // Verify ID format (should be cuid)
      expect(link.id).toMatch(/^c[a-z0-9]{24}$/);
      
      // Verify createdAt is valid ISO date
      expect(new Date(link.createdAt).toISOString()).toBe(link.createdAt);
      
      // Verify no extra properties are exposed
      expect(Object.keys(link)).toEqual(['id', 'slug', 'targetUrl', 'createdAt']);
    }
    
    // Verify that timestamps are in descending order
    const timestamps = links.map(link => new Date(link.createdAt).getTime());
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i-1]).toBeGreaterThan(timestamps[i]);
    }
  });

  it('should return empty array when no links exist', async () => {
    // Act: Request links when none exist
    const response = await request(app)
      .get('/api/v1/links');

    // Assert: Empty array response
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ links: [] });
  });

  it('should create link with proper response shape', async () => {
    // Act: Create a new link
    const response = await request(app)
      .post('/api/v1/links')
      .send({
        targetUrl: 'https://example.com/create-test',
        slug: 'create-test'
      });

    // Assert: Check response structure
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('link');
    
    const link = response.body.link;
    expect(link).toHaveProperty('id');
    expect(link).toHaveProperty('slug');
    expect(link).toHaveProperty('targetUrl');
    expect(link).toHaveProperty('shortUrl');
    expect(link).toHaveProperty('createdAt');
    
    // Verify values
    expect(link.slug).toBe('create-test');
    expect(link.targetUrl).toBe('https://example.com/create-test');
    expect(link.shortUrl).toMatch(/^http:\/\/[^\/]+\/r\/create-test$/);
    
    // Verify the link appears in the list endpoint
    const listResponse = await request(app).get('/api/v1/links');
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.links).toHaveLength(1);
    expect(listResponse.body.links[0].id).toBe(link.id);
  });

  it('should handle concurrent link creation properly', async () => {
    // Arrange: Create multiple links concurrently to test deterministic behavior
    const linkPromises = Array.from({ length: 5 }, (_, i) => 
      request(app)
        .post('/api/v1/links')
        .send({
          targetUrl: `https://example.com/concurrent-${i}`,
          slug: `concurrent-${i}`
        })
    );

    // Act: Create all links concurrently
    const responses = await Promise.all(linkPromises);

    // Assert: All links should be created successfully
    responses.forEach((response, i) => {
      expect(response.status).toBe(201);
      expect(response.body.link.slug).toBe(`concurrent-${i}`);
      expect(response.body.link.targetUrl).toBe(`https://example.com/concurrent-${i}`);
    });

    // Verify all links appear in list
    const listResponse = await request(app).get('/api/v1/links');
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.links).toHaveLength(5);
  });
});
