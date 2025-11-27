/**
 * API Response Utilities
 * 
 * Standardized API response helpers with:
 * - Consistent response format
 * - Automatic caching headers
 * - Performance optimizations
 * - Error handling
 */

import { NextResponse } from 'next/server';

interface ApiResponseOptions {
  // HTTP status code
  status?: number;
  // Cache control settings
  cache?: {
    // Cache duration in seconds (0 = no cache)
    maxAge?: number;
    // Allow CDN caching
    public?: boolean;
    // Stale-while-revalidate duration
    staleWhileRevalidate?: number;
    // Must revalidate
    mustRevalidate?: boolean;
  };
  // Additional headers
  headers?: Record<string, string>;
}

/**
 * Create a successful API response
 */
export function apiSuccess<T>(
  data: T,
  options: ApiResponseOptions = {}
): NextResponse {
  const { status = 200, cache, headers = {} } = options;

  const responseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add cache headers
  if (cache) {
    const cacheDirectives: string[] = [];

    if (cache.public) {
      cacheDirectives.push('public');
    } else {
      cacheDirectives.push('private');
    }

    if (cache.maxAge !== undefined) {
      cacheDirectives.push(`max-age=${cache.maxAge}`);
    }

    if (cache.staleWhileRevalidate !== undefined) {
      cacheDirectives.push(`stale-while-revalidate=${cache.staleWhileRevalidate}`);
    }

    if (cache.mustRevalidate) {
      cacheDirectives.push('must-revalidate');
    }

    responseHeaders['Cache-Control'] = cacheDirectives.join(', ');
  } else {
    // Default: no caching for API responses
    responseHeaders['Cache-Control'] = 'no-store, must-revalidate';
  }

  return NextResponse.json(data, {
    status,
    headers: responseHeaders,
  });
}

/**
 * Create an error API response
 */
export function apiError(
  message: string,
  options: {
    status?: number;
    code?: string;
    details?: unknown;
    field?: string;
  } = {}
): NextResponse {
  const { status = 500, code, details, field } = options;

  const errorResponse: Record<string, unknown> = {
    error: message,
  };

  if (code) {
    errorResponse.code = code;
  }

  if (details) {
    errorResponse.details = details;
  }

  if (field) {
    errorResponse.field = field;
    errorResponse.message = message;
  }

  return NextResponse.json(errorResponse, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * Common error responses
 */
export const ApiErrors = {
  unauthorized: () => apiError('Unauthorized', { status: 401, code: 'UNAUTHORIZED' }),
  forbidden: () => apiError('Forbidden', { status: 403, code: 'FORBIDDEN' }),
  notFound: (resource = 'Resource') => apiError(`${resource} not found`, { status: 404, code: 'NOT_FOUND' }),
  badRequest: (message = 'Bad Request') => apiError(message, { status: 400, code: 'BAD_REQUEST' }),
  conflict: (message = 'Conflict') => apiError(message, { status: 409, code: 'CONFLICT' }),
  tooManyRequests: () => apiError('Too Many Requests', { status: 429, code: 'RATE_LIMITED' }),
  internalError: (message = 'Internal Server Error') => apiError(message, { status: 500, code: 'INTERNAL_ERROR' }),
  validationError: (field: string, message: string) => apiError(message, { status: 400, code: 'VALIDATION_ERROR', field }),
};

/**
 * Paginated response helper
 */
export function apiPaginated<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total?: number;
    hasMore?: boolean;
  },
  options: ApiResponseOptions = {}
): NextResponse {
  const { page, limit, total, hasMore } = pagination;

  return apiSuccess(
    {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: total ? Math.ceil(total / limit) : undefined,
        hasMore: hasMore ?? (total ? page * limit < total : undefined),
      },
    },
    options
  );
}

/**
 * Slim down response payload by removing null/undefined values
 */
export function slimPayload<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        const slimmed = slimPayload(value as Record<string, unknown>);
        if (Object.keys(slimmed).length > 0) {
          (result as Record<string, unknown>)[key] = slimmed;
        }
      } else {
        (result as Record<string, unknown>)[key] = value;
      }
    }
  }

  return result;
}

/**
 * Slim down array of objects
 */
export function slimPayloadArray<T extends Record<string, unknown>>(arr: T[]): Partial<T>[] {
  return arr.map(slimPayload);
}

/**
 * Select only specified fields from object
 */
export function selectFields<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  fields: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const field of fields) {
    if (field in obj) {
      result[field] = obj[field];
    }
  }
  return result;
}

/**
 * Select fields from array of objects
 */
export function selectFieldsArray<T extends Record<string, unknown>, K extends keyof T>(
  arr: T[],
  fields: K[]
): Pick<T, K>[] {
  return arr.map((obj) => selectFields(obj, fields));
}
