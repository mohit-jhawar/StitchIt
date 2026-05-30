import 'dotenv/config';
import type { APIRoute } from 'astro';
import stripe from '../../../lib/stripe';
import db from '../../../lib/db';
import { sendSystemNotification } from '../../../lib/notifications';

// Disable default Astro body parsing so we can read the raw request text for signature verification
export const preredirect = false;

export const POST: APIRoute = async ({ request }) => {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured in environment variables.');
    return new Response('Webhook secret not configured on server', { status: 500 });
  }

  let event;
  try {
    // Read the raw body as text for Stripe signature validation
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Handle successful checkout payments
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as any;
    const metadata = session.metadata;

    if (!metadata || !metadata.orderId || !metadata.customerId || !metadata.paymentAmount) {
      console.error('⚠️ Stripe checkout session missing critical metadata:', session.id);
      return new Response('Missing session metadata', { status: 400 });
    }

    const { orderId, customerId, orderNumber, paymentAmount, paymentType } = metadata;
    const amount = parseFloat(paymentAmount);
    const type = paymentType || 'ADVANCE';

    try {
      // 1. Check if this payment session was already processed to avoid duplication (idempotency)
      const existingPayment = await db.payment.findFirst({
        where: {
          notes: {
            contains: session.id,
          },
        },
      });

      if (existingPayment) {
        console.log(`ℹ️ Webhook session ${session.id} was already reconciled. Skipping duplicate.`);
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      // 2. Create the Payment entry
      const payment = await db.payment.create({
        data: {
          orderId,
          amount,
          method: 'ONLINE',
          type: type as any,
          notes: `Stripe Online Payment (Session: ${session.id})`,
        },
      });

      // 3. Fetch the Order to fetch assigned tailor & user profiles
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: {
          customer: {
            include: {
              user: {
                select: { id: true },
              },
            },
          },
        },
      });

      if (order) {
        // 4. Update the order status on advance payments (moving PENDING -> CONFIRMED)
        if (type === 'ADVANCE' && order.status === 'PENDING') {
          await db.order.update({
            where: { id: orderId },
            data: { status: 'CONFIRMED' },
          });

          // Insert order status change timeline event
          await db.orderTimeline.create({
            data: {
              orderId,
              status: 'CONFIRMED',
              note: `Deposit payment of ₹${amount.toFixed(2)} received online. Order is now confirmed.`,
              updatedBy: 'Stripe Webhook',
            },
          });
        }

        // 5. Increment Tailor's total earnings if they are already assigned
        if (order.tailorId) {
          await db.tailorProfile.update({
            where: { id: order.tailorId },
            data: { totalEarnings: { increment: amount } },
          });
        }

        // 6. Award Loyalty Points (1 point per ₹100 cash paid)
        const pointsEarned = Math.floor(amount / 100);
        if (pointsEarned > 0) {
          await db.customerProfile.update({
            where: { id: order.customerId },
            data: { loyaltyPoints: { increment: pointsEarned } },
          });
        }

        // 7. Write an Audit Log entry for the payment
        await db.auditLog.create({
          data: {
            action: 'PAYMENT_RECEIVE',
            entityType: 'PAYMENT',
            entityId: payment.id,
            details: JSON.stringify({
              amount,
              orderNumber,
              stripeSessionId: session.id,
              pointsAwarded: pointsEarned,
            }),
          },
        });

        // 8. Fire dynamic System Notification
        const pointsMessage = pointsEarned > 0 ? ` You earned ${pointsEarned} loyalty points!` : '';
        await sendSystemNotification(
          order.customer.user.id,
          'Payment Confirmed',
          `Your online payment of ₹${amount.toFixed(2)} for order #${orderNumber} was successfully processed.${pointsMessage}`,
          'success'
        );
      }

      console.log(`✅ Stripe webhook reconciled payment for Order #${orderNumber} successfully.`);
    } catch (dbError) {
      console.error('⚠️ Database transaction failed during Stripe Webhook reconciliation:', dbError);
      return new Response('Database updates failed during reconciliation', { status: 500 });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
