import 'dotenv/config';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey && process.env.NODE_ENV === 'production') {
  console.warn('STRIPE_SECRET_KEY is not defined in production environment variables.');
}

// Initialize Stripe client. If the key is missing in dev mode, we initialize with a mock string
// to prevent startup crashes, though real API calls will fail until configured.
export const stripe = new Stripe(stripeSecretKey || 'mock_stripe_secret_key', {
  typescript: true,
} as any);

export default stripe;
