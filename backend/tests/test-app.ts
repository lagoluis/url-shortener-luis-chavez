import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { errorHandler } from '../src/middleware/error';
import { parseCreateLink, parseDateRange } from '../src/lib/validators';
import { randomSlug } from '../src/lib/slug';
import { normalizeRange } from '../src/lib/dates';
import { prismaTest } from './setup';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to check if a link exists
async function ensureLinkExists(id: string) {
  const link = await prismaTest.link.findUnique({
    where: { id },
    select: { id: true }
  });
  
  if (!link) {
    throw {
      status: 404,
      code: 'NOT_FOUND',
      message: 'Link not found'
    };
  }
  
  return link;
}

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.json({ ok: true });
});

// POST /api/v1/links - Create a new link
app.post('/api/v1/links', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const { targetUrl, slug: userSlug } = parseCreateLink(req.body);
    
    // Use provided slug or generate a new one
    let slug = userSlug || randomSlug();
    const wasSlugProvided = !!userSlug;
    
    // Attempt to create the link with retry logic for generated slugs
    let retries = 0;
    const maxRetries = 3;
    
    while (retries <= maxRetries) {
      try {
        const link = await prismaTest.link.create({
          data: {
            slug,
            targetUrl
          }
        });
        
        // Build short URL from request
        const protocol = req.get('X-Forwarded-Proto') || (req.secure ? 'https' : 'http');
        const host = req.get('Host') || 'localhost:3000';
        const shortUrl = `${protocol}://${host}/r/${slug}`;
        
        // Return successful response
        return res.status(201).json({
          link: {
            id: link.id,
            slug: link.slug,
            targetUrl: link.targetUrl,
            shortUrl,
            createdAt: link.createdAt
          }
        });
        
      } catch (dbError: any) {
        // Check if it's a unique constraint violation (P2002)
        if (dbError.code === 'P2002' && dbError.meta?.target?.includes('slug')) {
          if (wasSlugProvided) {
            // User provided slug is taken - return 409
            return res.status(409).json({
              error: {
                code: 'SLUG_TAKEN',
                message: 'Slug already exists'
              }
            });
          } else {
            // Generated slug collision - retry with new slug
            if (retries < maxRetries) {
              slug = randomSlug();
              retries++;
              continue;
            } else {
              // Max retries reached - return 500
              return res.status(500).json({
                error: {
                  code: 'INTERNAL',
                  message: 'Unable to generate unique slug after multiple attempts'
                }
              });
            }
          }
        }
        
        // Other database errors - let error handler deal with it
        throw dbError;
      }
    }
    
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/links - List all links
app.get('/api/v1/links', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const links = await prismaTest.link.findMany({
      select: {
        id: true,
        slug: true,
        targetUrl: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json({ links });
    
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/links/:id/analytics/summary - Get click summary for date range
app.get('/api/v1/links/:id/analytics/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // Ensure link exists
    await ensureLinkExists(id);
    
    // Parse and normalize date range
    const dateRange = parseDateRange(req.query);
    const [fromISO, toISO] = normalizeRange(dateRange);
    
    // Count clicks in the date range
    const total = await prismaTest.click.count({
      where: {
        linkId: id,
        tsUtc: {
          gte: new Date(fromISO),
          lte: new Date(toISO)
        }
      }
    });
    
    res.json({ total });
    
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/links/:id/analytics/daily - Get daily click counts for date range
app.get('/api/v1/links/:id/analytics/daily', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // Ensure link exists
    await ensureLinkExists(id);
    
    // Parse and normalize date range
    const dateRange = parseDateRange(req.query);
    const [fromISO, toISO] = normalizeRange(dateRange);
    
    // Query daily click counts using raw SQL
    const dailyData: { day: string; count: bigint }[] = await prismaTest.$queryRaw`
      SELECT date(ts_utc/1000, 'unixepoch') AS day, COUNT(*) AS count 
      FROM Click 
      WHERE linkId = ${id} 
        AND ts_utc BETWEEN ${new Date(fromISO)} AND ${new Date(toISO)}
      GROUP BY date(ts_utc/1000, 'unixepoch') 
      ORDER BY date(ts_utc/1000, 'unixepoch')
    `;
    
    // Convert BigInt to number and format response
    const dailyStats = dailyData.map(row => ({
      day: row.day,
      count: Number(row.count)
    }));
    
    res.json(dailyStats);
    
  } catch (error) {
    next(error);
  }
});

// GET /r/:slug - Redirect to target URL and record click
app.get('/r/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    
    // Lookup link by slug
    const link = await prismaTest.link.findUnique({
      where: { slug }
    });
    
    // If not found, return 404 with plain text
    if (!link) {
      return res.status(404).send('Not found');
    }
    
    // Record the click
    await prismaTest.click.create({
      data: {
        linkId: link.id,
        userAgent: req.headers['user-agent'] ?? ''
      }
    });
    
    // Redirect to target URL
    res.redirect(302, link.targetUrl);
    
  } catch (error) {
    next(error);
  }
});

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
