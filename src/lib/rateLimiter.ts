/**
 * In-memory rate limiter — two independent layers:
 *
 * 1. IP sliding window  — throttles request volume per IP
 * 2. Email lockout      — locks an account after N consecutive failures
 *
 * State is process-local (single-server). A stale-entry sweep runs
 * every 10 minutes so the Maps don't grow unbounded.
 */

// ─── Config ────────────────────────────────────────────────────────────────

const LOGIN_IP_MAX      = 10;              // max login attempts per IP per window
const LOGIN_IP_WINDOW   = 60_000;          // 1 minute
const REG_IP_MAX        = 5;              // max register attempts per IP per window
const REG_IP_WINDOW     = 10 * 60_000;    // 10 minutes
const FORGOT_IP_MAX       = 3;              // max forgot-password requests per IP per window
const FORGOT_IP_WINDOW    = 15 * 60_000;    // 15 minutes
const OTP_VERIFY_IP_MAX   = 5;              // max OTP verify attempts per IP per window
const OTP_VERIFY_IP_WINDOW = 15 * 60_000;   // 15 minutes
const RESEND_IP_MAX        = 3;              // max resend-verification requests per IP per window
const RESEND_IP_WINDOW     = 15 * 60_000;   // 15 minutes

const MAX_FAILURES      = 5;              // failed logins before lockout
const LOCKOUT_DURATION  = 15 * 60_000;    // 15 minutes

// ─── Stores ────────────────────────────────────────────────────────────────

interface WindowEntry {
  count: number;
  windowStart: number;
}

interface LockoutEntry {
  failures: number;
  lockedUntil: number | null;
}

const ipWindows   = new Map<string, WindowEntry>();
const emailLocks  = new Map<string, LockoutEntry>();

// Sweep stale entries every 10 minutes so Maps don't grow indefinitely.
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [k, v] of ipWindows)  if (now - v.windowStart > LOGIN_IP_WINDOW * 2) ipWindows.delete(k);
  for (const [k, v] of emailLocks) if (v.lockedUntil && now > v.lockedUntil + LOCKOUT_DURATION) emailLocks.delete(k);
}, 10 * 60_000);

// Don't keep Node alive just for cleanup
if (typeof sweep.unref === 'function') sweep.unref();

// ─── IP Sliding Window ─────────────────────────────────────────────────────

/**
 * Returns `{ allowed: true }` or `{ allowed: false, retryAfter: seconds }`.
 *
 * @param key       Unique key for this bucket (e.g. `login:${ip}`)
 * @param windowMs  Window length in milliseconds
 * @param max       Maximum requests allowed within the window
 */
function checkWindow(key: string, windowMs: number, max: number): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = ipWindows.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    ipWindows.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  entry.count += 1;

  if (entry.count > max) {
    const retryAfter = Math.ceil((windowMs - (now - entry.windowStart)) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

export function checkLoginIpLimit(ip: string) {
  return checkWindow(`login:${ip}`, LOGIN_IP_WINDOW, LOGIN_IP_MAX);
}

export function checkRegisterIpLimit(ip: string) {
  return checkWindow(`register:${ip}`, REG_IP_WINDOW, REG_IP_MAX);
}

export function checkForgotPasswordLimit(ip: string) {
  return checkWindow(`forgot:${ip}`, FORGOT_IP_WINDOW, FORGOT_IP_MAX);
}

export function checkOtpVerifyLimit(ip: string) {
  return checkWindow(`otp-verify:${ip}`, OTP_VERIFY_IP_WINDOW, OTP_VERIFY_IP_MAX);
}

export function checkResendVerificationLimit(ip: string) {
  return checkWindow(`resend:${ip}`, RESEND_IP_WINDOW, RESEND_IP_MAX);
}

// ─── Email Brute-Force Lockout ─────────────────────────────────────────────

/**
 * Returns `{ allowed: true }` or `{ allowed: false, retryAfter: seconds }`.
 * Call this BEFORE attempting password verification.
 */
export function checkEmailLockout(email: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = emailLocks.get(email.toLowerCase());

  if (!entry?.lockedUntil || now >= entry.lockedUntil) return { allowed: true };

  return { allowed: false, retryAfter: Math.ceil((entry.lockedUntil - now) / 1000) };
}

/**
 * Call after a failed login attempt for this email.
 * On the Nth failure (N = MAX_FAILURES) the account is locked.
 */
export function recordLoginFailure(email: string): void {
  const key = email.toLowerCase();
  const entry = emailLocks.get(key) ?? { failures: 0, lockedUntil: null };

  // If a previous lockout has expired, reset the counter
  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) {
    entry.failures  = 0;
    entry.lockedUntil = null;
  }

  entry.failures += 1;

  if (entry.failures >= MAX_FAILURES) {
    entry.lockedUntil = Date.now() + LOCKOUT_DURATION;
  }

  emailLocks.set(key, entry);
}

/**
 * Call after a SUCCESSFUL login to clear the failure counter.
 */
export function recordLoginSuccess(email: string): void {
  emailLocks.delete(email.toLowerCase());
}

// ─── IP Extraction Helper ──────────────────────────────────────────────────

/** Best-effort client IP from standard proxy headers. */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
