import { defineMiddleware } from 'astro:middleware';
import { verifyToken } from './lib/auth';
import db from './lib/db';

// CSRF protection: ensure Origin/Referer matches allowed site URL
function validateCsrf(request: Request): boolean {
  const origin = request.headers.get('origin') || request.headers.get('referer');
  if (!origin) return true; // No origin/referer – allow

  const allowed = process.env.SITE_URL;
  if (!allowed) {
    if (process.env.NODE_ENV !== 'production') return true;
    console.warn('SITE_URL not set in production. CSRF validation may be compromised.');
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const allowedUrl = new URL(allowed);
    return originUrl.hostname === allowedUrl.hostname;
  } catch {
    return false;
  }
}

const PROTECTED_ROUTES = ['/dashboard'];
const ADMIN_ROUTES = ['/dashboard/admin'];
const TAILOR_ROUTES = ['/dashboard/tailor'];
const CUSTOMER_ROUTES = ['/dashboard/customer'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, locals, redirect, cookies } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // CSRF check for state-changing methods
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    if (!validateCsrf(request)) {
      return new Response('CSRF validation failed', { status: 403 });
    }
  }

  // Use Astro's cookie API — more reliable than manual header parsing with @astrojs/node
  const token = cookies.get('auth_token')?.value;
  if (token) {
    const user = verifyToken(token);
    if (user) {
      // Invalidate tokens issued before a password change
      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        select: { passwordChangedAt: true },
      });
      const tokenIssuedAt = (user.iat ?? 0) * 1000;
      if (dbUser && dbUser.passwordChangedAt && tokenIssuedAt < dbUser.passwordChangedAt.getTime()) {
        // Token predates the last password change — force re-login
        cookies.delete('auth_token', { path: '/' });
      } else {
        locals.user = user;
      }
    }
  }

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  if (isProtected && !locals.user) {
    return redirect('/login?redirect=' + encodeURIComponent(pathname));
  }

  if (locals.user) {
    const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
    const isTailorRoute = TAILOR_ROUTES.some((r) => pathname.startsWith(r));
    const isCustomerRoute = CUSTOMER_ROUTES.some((r) => pathname.startsWith(r));

    if (isAdminRoute && locals.user.role !== 'ADMIN') return redirect('/dashboard');
    if (isTailorRoute && locals.user.role !== 'TAILOR') return redirect('/dashboard');
    if (isCustomerRoute && locals.user.role !== 'CUSTOMER') return redirect('/dashboard');
  }

  return next();
});
