// API client for URL shortener backend

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

// Type definitions matching backend responses
export interface Link {
  id: string;
  slug: string;
  targetUrl: string;
  shortUrl?: string;
  createdAt: string;
}

export interface LinkCreateRequest {
  targetUrl: string;
  slug?: string;
}

export interface LinkCreateResponse {
  link: Link;
}

export interface LinksListResponse {
  links: Link[];
}

export interface AnalyticsSummaryResponse {
  total: number;
}

export interface DailyStats {
  day: string; // YYYY-MM-DD format
  count: number;
}

export type AnalyticsDailyResponse = DailyStats[];

export interface DateRange {
  from?: string; // ISO datetime string
  to?: string;   // ISO datetime string
}

// Unified error envelope from backend
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
}

// Custom error class for API errors
export class ApiException extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiException';
  }
}

// Generic API request function with error handling
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    // Parse response body
    let data;
    try {
      data = await response.json();
    } catch {
      // If JSON parsing fails, throw a generic error
      throw new ApiException(
        response.status,
        'PARSE_ERROR',
        'Failed to parse server response'
      );
    }

    // Handle error responses with unified error envelope
    if (!response.ok) {
      const error = data as ApiError;
      throw new ApiException(
        response.status,
        error.error.code,
        error.error.message,
        error.error.details
      );
    }

    return data as T;
  } catch (error) {
    // Re-throw ApiException as-is
    if (error instanceof ApiException) {
      throw error;
    }
    
    // Handle network errors or other fetch failures
    throw new ApiException(
      0,
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Network request failed'
    );
  }
}

// API functions
export async function listLinks(): Promise<Link[]> {
  const response = await apiRequest<LinksListResponse>('/api/v1/links');
  return response.links;
}

export async function createLink(body: LinkCreateRequest): Promise<Link> {
  const response = await apiRequest<LinkCreateResponse>('/api/v1/links', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return response.link;
}

export async function getSummary(id: string, range?: DateRange): Promise<number> {
  const params = new URLSearchParams();
  if (range?.from) params.append('from', range.from);
  if (range?.to) params.append('to', range.to);
  
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await apiRequest<AnalyticsSummaryResponse>(
    `/api/v1/links/${id}/analytics/summary${query}`
  );
  return response.total;
}

export async function getDaily(id: string, range?: DateRange): Promise<DailyStats[]> {
  const params = new URLSearchParams();
  if (range?.from) params.append('from', range.from);
  if (range?.to) params.append('to', range.to);
  
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await apiRequest<AnalyticsDailyResponse>(
    `/api/v1/links/${id}/analytics/daily${query}`
  );
  return response;
}

// Utility function to format API errors for display
export function formatApiError(error: unknown): string {
  if (error instanceof ApiException) {
    if (error.details && error.details.length > 0) {
      const fieldErrors = error.details.map(d => `${d.field}: ${d.message}`).join(', ');
      return `${error.message} (${fieldErrors})`;
    }
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}
