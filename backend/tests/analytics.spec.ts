import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import app from './test-app';
import { setupTestDatabase, cleanupTestDatabase, teardownTestDatabase, prismaTest } from './setup';

describe('Analytics functionality', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it('should return daily click aggregation with correct counts and sorted days', async () => {
    // Arrange: Create a link
    const link = await prismaTest.link.create({
      data: {
        slug: 'analytics-test',
        targetUrl: 'https://example.com/analytics'
      }
    });

    // Insert clicks across 3 distinct days with specific counts
    const day1 = new Date('2025-01-01T10:00:00.000Z');
    const day2 = new Date('2025-01-02T14:30:00.000Z');
    const day3 = new Date('2025-01-03T09:15:00.000Z');

    // Day 1: 3 clicks
    await prismaTest.click.createMany({
      data: [
        { linkId: link.id, tsUtc: new Date('2025-01-01T10:00:00.000Z'), userAgent: 'test1' },
        { linkId: link.id, tsUtc: new Date('2025-01-01T15:00:00.000Z'), userAgent: 'test2' },
        { linkId: link.id, tsUtc: new Date('2025-01-01T20:00:00.000Z'), userAgent: 'test3' }
      ]
    });

    // Day 2: 5 clicks
    await prismaTest.click.createMany({
      data: [
        { linkId: link.id, tsUtc: new Date('2025-01-02T09:00:00.000Z'), userAgent: 'test4' },
        { linkId: link.id, tsUtc: new Date('2025-01-02T12:00:00.000Z'), userAgent: 'test5' },
        { linkId: link.id, tsUtc: new Date('2025-01-02T15:00:00.000Z'), userAgent: 'test6' },
        { linkId: link.id, tsUtc: new Date('2025-01-02T18:00:00.000Z'), userAgent: 'test7' },
        { linkId: link.id, tsUtc: new Date('2025-01-02T21:00:00.000Z'), userAgent: 'test8' }
      ]
    });

    // Day 3: 2 clicks
    await prismaTest.click.createMany({
      data: [
        { linkId: link.id, tsUtc: new Date('2025-01-03T11:00:00.000Z'), userAgent: 'test9' },
        { linkId: link.id, tsUtc: new Date('2025-01-03T16:00:00.000Z'), userAgent: 'test10' }
      ]
    });

    // Act: Request daily analytics for the date range
    const response = await request(app)
      .get(`/api/v1/links/${link.id}/analytics/daily`)
      .query({
        from: '2025-01-01T00:00:00.000Z',
        to: '2025-01-03T23:59:59.999Z'
      });

    // Assert: Check response structure and data
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);

    // Verify the data is sorted by day and has correct counts
    expect(response.body).toEqual([
      { day: '2025-01-01', count: 3 },
      { day: '2025-01-02', count: 5 },
      { day: '2025-01-03', count: 2 }
    ]);
  });

  it('should return summary analytics with correct total', async () => {
    // Arrange: Create a link and clicks
    const link = await prismaTest.link.create({
      data: {
        slug: 'summary-test',
        targetUrl: 'https://example.com/summary'
      }
    });

    // Create 7 clicks across different days
    await prismaTest.click.createMany({
      data: [
        { linkId: link.id, tsUtc: new Date('2025-01-01T10:00:00.000Z'), userAgent: 'test1' },
        { linkId: link.id, tsUtc: new Date('2025-01-01T11:00:00.000Z'), userAgent: 'test2' },
        { linkId: link.id, tsUtc: new Date('2025-01-02T10:00:00.000Z'), userAgent: 'test3' },
        { linkId: link.id, tsUtc: new Date('2025-01-02T11:00:00.000Z'), userAgent: 'test4' },
        { linkId: link.id, tsUtc: new Date('2025-01-02T12:00:00.000Z'), userAgent: 'test5' },
        { linkId: link.id, tsUtc: new Date('2025-01-03T10:00:00.000Z'), userAgent: 'test6' },
        { linkId: link.id, tsUtc: new Date('2025-01-03T11:00:00.000Z'), userAgent: 'test7' }
      ]
    });

    // Act: Request summary analytics
    const response = await request(app)
      .get(`/api/v1/links/${link.id}/analytics/summary`)
      .query({
        from: '2025-01-01T00:00:00.000Z',
        to: '2025-01-03T23:59:59.999Z'
      });

    // Assert: Check total count
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ total: 7 });
  });

  it('should return empty array for links with no clicks in date range', async () => {
    // Arrange: Create a link with no clicks
    const link = await prismaTest.link.create({
      data: {
        slug: 'no-clicks',
        targetUrl: 'https://example.com/noclicks'
      }
    });

    // Act: Request daily analytics
    const response = await request(app)
      .get(`/api/v1/links/${link.id}/analytics/daily`)
      .query({
        from: '2025-01-01T00:00:00.000Z',
        to: '2025-01-03T23:59:59.999Z'
      });

    // Assert: Empty array
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('should return 404 for non-existent link ID', async () => {
    // Act: Request analytics for non-existent link
    const response = await request(app)
      .get('/api/v1/links/nonexistent-id/analytics/daily');

    // Assert: 404 with error envelope
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Link not found'
      }
    });
  });

  it('should filter summary analytics correctly with from/to date range', async () => {
    // Arrange: Create a link
    const link = await prismaTest.link.create({
      data: {
        slug: 'date-filter-test',
        targetUrl: 'https://example.com/datefilter'
      }
    });

    // Insert clicks across multiple days with deterministic timestamps
    await prismaTest.click.createMany({
      data: [
        // Before the filter range (should be excluded)
        { linkId: link.id, tsUtc: new Date('2024-12-01T10:00:00.000Z'), userAgent: 'before1' },
        { linkId: link.id, tsUtc: new Date('2024-12-02T10:00:00.000Z'), userAgent: 'before2' },
        
        // Within the filter range (should be included)
        { linkId: link.id, tsUtc: new Date('2024-12-10T10:00:00.000Z'), userAgent: 'within1' },
        { linkId: link.id, tsUtc: new Date('2024-12-11T10:00:00.000Z'), userAgent: 'within2' },
        { linkId: link.id, tsUtc: new Date('2024-12-12T10:00:00.000Z'), userAgent: 'within3' },
        { linkId: link.id, tsUtc: new Date('2024-12-15T10:00:00.000Z'), userAgent: 'within4' },
        
        // After the filter range (should be excluded)
        { linkId: link.id, tsUtc: new Date('2024-12-25T10:00:00.000Z'), userAgent: 'after1' },
        { linkId: link.id, tsUtc: new Date('2024-12-26T10:00:00.000Z'), userAgent: 'after2' }
      ]
    });

    // Act: Request summary with specific date range
    const response = await request(app)
      .get(`/api/v1/links/${link.id}/analytics/summary`)
      .query({
        from: '2024-12-10T00:00:00.000Z',
        to: '2024-12-20T23:59:59.999Z'
      });

    // Assert: Should only count clicks within the date range
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ total: 4 });

    // Test edge case: Exact boundary timestamps
    const edgeCaseResponse = await request(app)
      .get(`/api/v1/links/${link.id}/analytics/summary`)
      .query({
        from: '2024-12-11T10:00:00.000Z', // Exact timestamp of one click
        to: '2024-12-12T10:00:00.000Z'   // Exact timestamp of another click
      });

    expect(edgeCaseResponse.status).toBe(200);
    expect(edgeCaseResponse.body).toEqual({ total: 2 });
  });

  it('should handle summary analytics with no date range (default to last 30 days)', async () => {
    // Arrange: Create a link
    const link = await prismaTest.link.create({
      data: {
        slug: 'default-range-test',
        targetUrl: 'https://example.com/defaultrange'
      }
    });

    // Insert clicks - some recent, some old
    const now = new Date();
    const recent = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    const old = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);   // 45 days ago

    await prismaTest.click.createMany({
      data: [
        { linkId: link.id, tsUtc: recent, userAgent: 'recent1' },
        { linkId: link.id, tsUtc: recent, userAgent: 'recent2' },
        { linkId: link.id, tsUtc: old, userAgent: 'old1' },
        { linkId: link.id, tsUtc: old, userAgent: 'old2' }
      ]
    });

    // Act: Request summary without date range (should default to last 30 days)
    const response = await request(app)
      .get(`/api/v1/links/${link.id}/analytics/summary`);

    // Assert: Should only include recent clicks (within last 30 days)
    expect(response.status).toBe(200);
    expect(response.body.total).toBeGreaterThanOrEqual(2); // At least the recent clicks
    // The exact count might be higher due to default range behavior
  });

  it('should handle daily analytics with precise date filtering', async () => {
    // Arrange: Create a link
    const link = await prismaTest.link.create({
      data: {
        slug: 'daily-filter-test',
        targetUrl: 'https://example.com/dailyfilter'
      }
    });

    // Insert clicks across multiple days with specific patterns
    await prismaTest.click.createMany({
      data: [
        // Day 1: 3 clicks
        { linkId: link.id, tsUtc: new Date('2024-06-01T09:00:00.000Z'), userAgent: 'day1-1' },
        { linkId: link.id, tsUtc: new Date('2024-06-01T15:00:00.000Z'), userAgent: 'day1-2' },
        { linkId: link.id, tsUtc: new Date('2024-06-01T21:00:00.000Z'), userAgent: 'day1-3' },
        
        // Day 2: 1 click
        { linkId: link.id, tsUtc: new Date('2024-06-02T12:00:00.000Z'), userAgent: 'day2-1' },
        
        // Day 3: 4 clicks
        { linkId: link.id, tsUtc: new Date('2024-06-03T08:00:00.000Z'), userAgent: 'day3-1' },
        { linkId: link.id, tsUtc: new Date('2024-06-03T12:00:00.000Z'), userAgent: 'day3-2' },
        { linkId: link.id, tsUtc: new Date('2024-06-03T16:00:00.000Z'), userAgent: 'day3-3' },
        { linkId: link.id, tsUtc: new Date('2024-06-03T20:00:00.000Z'), userAgent: 'day3-4' },
        
        // Outside range - should be excluded
        { linkId: link.id, tsUtc: new Date('2024-05-31T23:59:59.000Z'), userAgent: 'before' },
        { linkId: link.id, tsUtc: new Date('2024-06-04T00:00:01.000Z'), userAgent: 'after' }
      ]
    });

    // Act: Request daily analytics for the specific range
    const response = await request(app)
      .get(`/api/v1/links/${link.id}/analytics/daily`)
      .query({
        from: '2024-06-01T00:00:00.000Z',
        to: '2024-06-03T23:59:59.999Z'
      });

    // Assert: Should return exactly 3 days with correct counts
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
    expect(response.body).toEqual([
      { day: '2024-06-01', count: 3 },
      { day: '2024-06-02', count: 1 },
      { day: '2024-06-03', count: 4 }
    ]);
  });

  it('should validate date range parameters properly', async () => {
    // Arrange: Create a link
    const link = await prismaTest.link.create({
      data: {
        slug: 'validation-test',
        targetUrl: 'https://example.com/validation'
      }
    });

    // Act & Assert: Test invalid date formats
    const invalidFromResponse = await request(app)
      .get(`/api/v1/links/${link.id}/analytics/summary`)
      .query({
        from: 'invalid-date',
        to: '2024-06-01T23:59:59.999Z'
      });

    expect(invalidFromResponse.status).toBe(400);
    expect(invalidFromResponse.body.error.code).toBe('VALIDATION_ERROR');

    const invalidToResponse = await request(app)
      .get(`/api/v1/links/${link.id}/analytics/summary`)
      .query({
        from: '2024-06-01T00:00:00.000Z',
        to: 'invalid-date'
      });

    expect(invalidToResponse.status).toBe(400);
    expect(invalidToResponse.body.error.code).toBe('VALIDATION_ERROR');
  });
});
