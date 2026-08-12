// Netlify Function: Stripe webhook handler.
// Path: site/netlify/functions/webhook.js
// Requires env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
import Stripe from 'stripe';

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return { statusCode: 500, body: 'Missing Stripe env vars' };
  }

  const stripe = new Stripe(secretKey);
  const sig = event.headers['stripe-signature'];

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
  } catch (err) {
    return { statusCode: 400, body: 'Webhook signature verification failed' };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    // TODO: mark the report as fulfilled for this customer.
    // Write to Netlify Blobs, a KV store, or your existing docs/js/auth.js
    // recordPayment() endpoint. Store: customer_email, session.id,
    // amount_total, payment_status, created.
    console.log('PAYMENT_COMPLETE', JSON.stringify({
      session_id: session.id,
      customer_email: session.customer_details && session.customer_details.email,
      amount_total: session.amount_total,
      payment_status: session.payment_status,
    }));
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
}
