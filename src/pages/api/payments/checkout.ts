import 'dotenv/config';
import type { APIRoute } from 'astro';
import { z } from 'zod';
import db from '../../../lib/db';
import stripe from '../../../lib/stripe';
import { jsonResponse, errorResponse } from '../../../lib/utils';

const checkoutSchema = z.object({
  orderId: z.string(),
  amount: z.number().positive('Payment amount must be greater than zero'),
});

export const POST: APIRoute = async ({ locals, request }) => {
  // 1. Authorize user is a logged-in customer
  if (!locals.user) {
    return errorResponse('Unauthorized. Please log in.', 401);
  }

  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Invalid payment parameters', 400);
    }

    const { orderId, amount } = parsed.data;

    // 2. Fetch Customer Profile
    const customerProfile = await db.customerProfile.findUnique({
      where: { userId: locals.user.id },
    });

    if (!customerProfile) {
      return errorResponse('Customer profile not found.', 404);
    }

    // 3. Fetch Order and verify ownership
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });

    if (!order) {
      return errorResponse('Order not found.', 404);
    }

    if (order.customerId !== customerProfile.id) {
      return errorResponse('Forbidden. You do not own this order.', 403);
    }

    // 4. Calculate unpaid balance
    const paymentsAggregate = await db.payment.aggregate({
      where: { orderId },
      _sum: { amount: true },
    });

    const alreadyPaid = paymentsAggregate._sum.amount ?? 0;
    const remainingBalance = Math.max(0, order.totalAmount - alreadyPaid);

    // Guard against overpayments (with a tiny delta allowance for float rounding)
    if (amount > remainingBalance + 0.05) {
      return errorResponse(
        `Payment amount of ₹${amount.toFixed(2)} exceeds remaining balance of ₹${remainingBalance.toFixed(2)}.`,
        400
      );
    }

    // 5. Create Stripe Checkout Session
    // We use automatic_payment_methods to let Stripe dynamically offer Cards, UPI, and Netbanking
    // based on customer country and your Stripe Dashboard setup.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr', // Using INR as configured in the StitchIt boutique catalog
            product_data: {
              name: `StitchIt Order #${order.orderNumber}`,
              description: `Custom Tailoring Service - Payment for Order`,
            },
            unit_amount: Math.round(amount * 100), // Stripe expects amount in paise (cents)
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.SITE_URL}/dashboard/customer/payments?success=true&orderNumber=${order.orderNumber}`,
      cancel_url: `${process.env.SITE_URL}/dashboard/customer/payments?cancelled=true`,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: customerProfile.id,
        paymentAmount: String(amount),
        paymentType: alreadyPaid === 0 ? 'ADVANCE' : 'BALANCE', // First payment is treated as Advance deposit
      },
      customer_email: locals.user.email,
    } as any);

    if (!session.url) {
      return errorResponse('Failed to generate payment session with Stripe.', 500);
    }

    return jsonResponse({ checkoutUrl: session.url });
  } catch (err: any) {
    console.error('Stripe Checkout Error:', err);
    return errorResponse(err.message || 'Internal server error during checkout initiation.', 500);
  }
};
