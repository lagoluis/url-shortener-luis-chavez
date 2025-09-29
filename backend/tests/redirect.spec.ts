import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import app from './test-app';
import { setupTestDatabase, cleanupTestDatabase, teardownTestDatabase, prismaTest } from './setup';

describe('Redirect functionality', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should redirect to target URL and record exactly one click', async () => {
    // Arrange: Create a link directly via Prisma
    const link = await prismaTest.link.create({
      data: {
        slug: 'test-redirect',
        targetUrl: 'https://example.com/target'
      }
    });

    // Verify no clicks exist initially
    const initialClicks = await prismaTest.click.count({
      where: { linkId: link.id }
    });
    expect(initialClicks).toBe(0);

    // Act: Make request to redirect endpoint
    const response = await request(app)
      .get('/r/test-redirect')
      .set('User-Agent', 'test-browser/1.0');

    // Assert: Check response
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('https://example.com/target');

    // Assert: Verify exactly one click was recorded
    const finalClicks = await prismaTest.click.findMany({
      where: { linkId: link.id }
    });
    
    expect(finalClicks).toHaveLength(1);
    expect(finalClicks[0].linkId).toBe(link.id);
    expect(finalClicks[0].userAgent).toBe('test-browser/1.0');
    expect(finalClicks[0].tsUtc).toBeInstanceOf(Date);
  });

  it('should return 404 for non-existent slug', async () => {
    // Act: Request non-existent slug
    const response = await request(app)
      .get('/r/nonexistent');

    // Assert: 404 with plain text "Not found"
    expect(response.status).toBe(404);
    expect(response.text).toBe('Not found');
  });

  it('should record multiple clicks for same link', async () => {
    // Arrange: Create a link
    const link = await prismaTest.link.create({
      data: {
        slug: 'multi-click',
        targetUrl: 'https://example.com/multi'
      }
    });

    // Act: Make multiple requests
    await request(app)
      .get('/r/multi-click')
      .set('User-Agent', 'browser-1');

    await request(app)
      .get('/r/multi-click')
      .set('User-Agent', 'browser-2');

    // Assert: Two clicks recorded
    const clicks = await prismaTest.click.findMany({
      where: { linkId: link.id },
      orderBy: { tsUtc: 'asc' }
    });

    expect(clicks).toHaveLength(2);
    expect(clicks[0].userAgent).toBe('browser-1');
    expect(clicks[1].userAgent).toBe('browser-2');
  });
});
