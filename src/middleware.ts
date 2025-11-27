import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Simple in-memory rate limiter for middleware (Edge-compatible)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  // Clean old entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetAt < now) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!record || record.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

// Helper to get client IP (ignoring localhost in dev)
function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const ip = forwarded.split(',')[0]?.trim();
    if (ip && ip !== '::1' && ip !== '127.0.0.1') return ip;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp && realIp !== '::1' && realIp !== '127.0.0.1') return realIp;
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get client IP for rate limiting and geo-blocking
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ??
    request.headers.get('x-real-ip') ??
    'unknown';

  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    // Stricter limit for auth endpoints
    const limit = pathname.startsWith('/api/auth') ? 20 : 100;
    
    if (!checkRateLimit(`${ip}:${pathname.split('/')[2]}`, limit)) {
      return new NextResponse(
        JSON.stringify({ error: 'Too Many Requests', message: 'Rate limit exceeded' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        }
      );
    }
  }

  // Allow the blocked page itself to render without redirect loops
  if (pathname.startsWith('/blocked')) {
    return NextResponse.next();
  }

  // Geo-blocking: restrict access from specific countries
  const geoCookie = request.cookies.get('geo-block-status');
  const isBlockedCookie = geoCookie?.value === 'blocked';

  if (isBlockedCookie) {
    // Already determined as blocked: redirect everything to /blocked
    const blockedUrl = new URL('/blocked', request.url);
    return NextResponse.redirect(blockedUrl);
  }

  // Only perform GeoIP lookup if we haven't decided yet
  const geoServiceUrl = process.env.GEOIP_SERVICE_URL;
  if (geoServiceUrl) {
    const clientIp = getClientIp(request);

    if (clientIp) {
      try {
        const url = new URL(geoServiceUrl);
        url.searchParams.set('ip', clientIp);

        const geoRes = await fetch(url.toString(), { cache: 'no-store' });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          const countryRaw: string | undefined =
            geoData.country || geoData.country_name || geoData.countryCode;
          const country = countryRaw?.toLowerCase();

          const blockedCountries = ['pakistan', 'bangladesh', 'afghanistan', 'iran'];

          if (country && blockedCountries.includes(country)) {
            const blockedUrl = new URL('/blocked', request.url);
            const response = NextResponse.redirect(blockedUrl);
            response.cookies.set('geo-block-status', 'blocked', {
              path: '/',
              maxAge: 60 * 60 * 24, // 1 day
              sameSite: 'lax',
            });
            return response;
          }
        }
      } catch (error) {
        // Fail open on GeoIP errors; do not block legit users due to service issues
        console.error('Geo-block lookup failed:', error);
      }
    }
  }

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/auth/signin',
    '/auth/signup',
    '/auth/error',
    '/api/auth',
    // Admin API uses its own auth system; do not gate it on NextAuth
    '/api/admin',
    '/api/debug/env',
    // Admin panel uses its own auth system; do not gate it on NextAuth
    '/admin',
    '/admin/login',
    // Public read access to posts and profiles (actions still require auth in the API handlers)
    '/api/posts',
    '/api/profile',
    '/api/users',
    '/api/hashtag',
    '/api/recommendations',
    // Public pages
    '/home',
    '/explore',
    '/trending',
    '/post',
    '/hashtag',
    // Banned and deleted users pages
    '/banned',
    '/account-deleted',
  ];

  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  // Get NextAuth JWT (does not hit Supabase at all)
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // If no session and route is protected → send to sign-in
  if (!token && !isPublicRoute) {
    const redirectUrl = new URL('/auth/signin', request.url);
    redirectUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is authenticated and hits landing page, send to /home
  if (token && pathname === '/') {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // Add performance headers
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
