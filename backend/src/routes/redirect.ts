import express, { Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

const router = express.Router();

// GET /r/:slug - Redirect to target URL and record click
router.get('/r/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    
    // Lookup link by slug
    const link = await prisma.link.findUnique({
      where: { slug }
    });
    
    // If not found, return 404 with plain text
    if (!link) {
      return res.status(404).send('Not found');
    }
    
    // Record the click
    await prisma.click.create({
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

export default router;
