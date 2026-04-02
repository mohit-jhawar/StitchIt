import type { APIRoute } from 'astro';
import { jsonResponse } from '../../../lib/utils';

export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete('auth_token', { path: '/' });
  return jsonResponse({ success: true });
};
