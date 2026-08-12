// Netlify Function: Stripe webhook handler.
// Path: site/netlify/functions/webhook.js
// Requires env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
// On checkout.session.completed: stores a PROCESSING record in Netlify Blobs and
// returns 200 fast. process-queue.js (scheduled) later generates + emails the report.
import Stripe from 'stripe';
import { getStore } from '@netlify/blobs';

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
    const record = {
      session_id: session.id,
      customer_email: session.customer_details && session.customer_details.email,
      domain: session.client_reference_id || (session.metadata && session.metadata.domain) || '',
      amount_total: session.amount_total,
      payment_status: session.payment_status,
      status: 'PROCESSING',
      created: Math.floor(Date.now() / 1000),
      createdAt: Date.now(),
      attempts: 0,
    };

    try {
      const store = getStore('checkout_sessions');
      await store.set(session.id, JSON.stringify(record));
      console.log('PAYMENT_STORED', JSON.stringify(record));
    } catch (e) {
      console.error('BLOB_WRITE_FAILED', String((e && e.message) || e));
    }

    console.log('PAYMENT_COMPLETE', JSON.stringify(record));
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
}