import { z } from 'zod';

// Schema for creating a link
export const createLinkSchema = z.object({
  targetUrl: z.url('Target URL must be a valid URL')
    .refine((url) => {
      try {
        const protocol = new URL(url).protocol;
        return protocol === 'http:' || protocol === 'https:';
      } catch {
        // If URL construction fails, this is an invalid URL that somehow
        // passed z.url() - treat as failing the protocol check
        return false;
      }
    }, 'Target URL must use http or https protocol'),
  
  slug: z.string()
    .regex(/^[A-Za-z0-9_-]{1,64}$/, 'Slug must be 1-64 characters of letters, numbers, underscore, or dash')
    .optional()
});

// Schema for date range queries
export const dateRangeSchema = z.object({
  from: z.iso
    .datetime({ message: 'From date must be a valid ISO datetime string' })
    .optional(),
  to: z.iso
    .datetime({ message: 'To date must be a valid ISO datetime string' })
    .optional()
});

// Helper function to parse and validate link creation data
export function parseCreateLink(body: any) {
  try {
    return createLinkSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.issues.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      throw {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details
      };
    }
    throw error;
  }
}

// Helper function to parse and validate date range query parameters
export function parseDateRange(query: any) {
  try {
    return dateRangeSchema.parse(query);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.issues.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      throw {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid date range parameters',
        details
      };
    }
    throw error;
  }
}
