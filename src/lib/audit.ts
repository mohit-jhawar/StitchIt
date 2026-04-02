import db from './db';

export async function logAction(
  userId: string | undefined,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: any,
  request?: Request
) {
  try {
    const ipAddress = request?.headers.get('x-forwarded-for') || null;
    const userAgent = request?.headers.get('user-agent') || null;

    await db.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    console.error('Audit log failed:', err);
    // Non-blocking, don't throw
  }
}

export default logAction;
