import db from './db';

export async function sendSystemNotification(
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
) {
  try {
    await db.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    });
  } catch (err) {
    console.error('Notification creation failed:', err);
    // Non-blocking
  }
}

export default sendSystemNotification;
