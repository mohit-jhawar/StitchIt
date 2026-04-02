import crypto from 'crypto';

/**
 * Generate a 6-digit numeric OTP for email verification.
 */
export function generateVerificationToken(): string {
  return generateOTP();
}

/**
 * Generate a cryptographically secure 6-digit numeric OTP.
 */
export function generateOTP(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Generate a cryptographically secure 64-char hex token for password reset links.
 * Expires in 1 hour.
 */
export function generateResetToken(): { token: string; expires: Date } {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return { token, expires };
}
