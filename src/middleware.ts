import { defineMiddleware } from 'astro:middleware';
import { verifyToken } from './lib/auth';
import db from './lib/db';

function validateCsrf(request: Request): boolean {
  const origin = request.headers.get('origin') || request.headers.get('referer');
  if (!origin) return true; // No origin/referer – allow

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    
    // 1. Check if it matches the current request's host natively
    if (originUrl.hostname === requestUrl.hostname) return true;

    // 2. Fallback to SITE_URL environment variable if provided
    const allowed = process.env.SITE_URL;
    if (allowed) {
      // Handle cases where user forgot to add https:// in Netlify
      const allowedWithProto = allowed.startsWith('http') ? allowed : `https://${allowed}`;
      const allowedUrl = new URL(allowedWithProto);
      if (originUrl.hostname === allowedUrl.hostname) return true;
    }

    // 3. Allow localhost for local development
    if (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1') return true;

    console.warn(`CSRF failed: origin ${originUrl.hostname} did not match request ${requestUrl.hostname} or SITE_URL`);
    return false;
  } catch (err) {
    console.error('CSRF validation URL parsing error:', err);
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
