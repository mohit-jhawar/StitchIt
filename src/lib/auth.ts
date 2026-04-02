import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET || (import.meta as any).env?.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing JWT_SECRET environment variable. Set it in your .env file.');
  }
  return secret;
})();
const COOKIE_NAME = 'auth_token';

export interface TokenPayload {
  id: string;
  email: string;
  role: 'ADMIN' | 'CUSTOMER' | 'TAILOR';
  name: string;
  iat?: number; // JWT issued-at (seconds), populated automatically by jsonwebtoken
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function getUserFromRequest(request: Request): TokenPayload | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...v] = c.trim().split('=');
      return [key.trim(), decodeURIComponent(v.join('='))];
    })
  );

  const token = cookies[COOKIE_NAME];
  if (!token) return null;

  return verifyToken(token);
}

export function setCookieHeader(token: string): string {
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`;
}

export function clearCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}
