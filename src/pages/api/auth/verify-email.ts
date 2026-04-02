import type { APIRoute } from 'astro';
import db from '../../../lib/db';
import { logAction } from '../../../lib/audit';

export const GET: APIRoute = async ({ url, redirect }) => {
  const token = url.searchParams.get('token');
  
  if (!token) {
    return redirect('/login?error=Invalid verification link');
  }

  try {
    const user = await db.user.findFirst({
      where: { verificationToken: token }
    });

    if (!user) {
      return redirect('/login?error=Link expired or already used');
    }

    // Mark as verified and clear token
    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null
      }
    });

    await logAction(user.id, 'EMAIL_VERIFIED', 'USER', user.id, { email: user.email });

    return redirect('/login?success=Email verified successfully! You can now log in.');
  } catch (err) {
    console.error('Verification error:', err);
    return redirect('/login?error=Internal server error');
  }
};
