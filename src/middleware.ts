import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import redis from "@/lib/redis";

// Rate limiting
const RATE_LIMIT = 100; // requêtes par minute
const WINDOW = 60;

async function rateLimit(req: NextRequest) {
  const ip = req.ip || 'unknown';
  const key = `ratelimit:${ip}`;
  try {
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, WINDOW);
    if (current > RATE_LIMIT) {
      return new NextResponse('Trop de requêtes. Veuillez réessayer dans une minute.', { status: 429 });
    }
  } catch (error) {
    console.error("Rate limiting error:", error);
    // En cas d'erreur Redis, on laisse passer pour ne pas bloquer l'utilisateur.
  }
  return null;
}

export default withAuth(
  async function middleware(req: NextRequest) {
    // 1. Rate Limiting (sauf pour les routes statiques)
    if (!req.nextUrl.pathname.startsWith('/_next') && !req.nextUrl.pathname.startsWith('/api/auth')) {
      const rateLimitResponse = await rateLimit(req);
      if (rateLimitResponse) return rateLimitResponse;
    }

    // 2. Headers de sécurité (CSP, etc.)
    const response = NextResponse.next();
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.supabase.co;"
    );
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 3. Vérification des rôles (si nécessaire)
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (path.startsWith('/admin') && token?.role !== 'Administrateur') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    if (path.startsWith('/dashboard') && !token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = { matcher: ["/dashboard/:path*", "/admin/:path*", "/api/:path*"] };
