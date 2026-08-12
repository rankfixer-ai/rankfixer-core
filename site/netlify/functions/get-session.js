// Netlify Function: retrieve checkout status + report for the success page.
// Path: site/netlify/functions/get-session.js
// Requires env: STRIPE_SECRET_KEY.
// Identity (email/domain/paid) comes from Stripe (instant); status + report_url
// come from Netlify Blobs (written by webhook.js and process-queue.js).
import Stripe from 'stripe';
import { getStore } from '@netlify/blobs';

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'STRIPE_SECRET_KEY is not configured' }) };
  }

  const sessionId = (event.queryStringParameters && event.queryStringParameters.session_id) || '';
  if (!sessionId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'missing session_id' }) };
  }

  const stripe = new Stripe(secretKey);
  let stripeSession = null;
  try {
    stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (_) {}

  let record = null;
  try {
    const store = getStore('checkout_sessions');
    const raw = await store.get(sessionId);
    record = raw ? JSON.parse(raw) : null;
  } catch (_) {}

  const domain = (stripeSession && (stripeSession.client_reference_id || (stripeSession.metadata && stripeSession.metadata.domain))) || (record && record.domain) || '';
  const email = (stripeSession && stripeSession.customer_details && stripeSession.customer_details.email) || (record && record.customer_email) || '';
  const paid = !!(stripeSession && stripeSession.payment_status === 'paid');
  const status = (record && record.status) || (paid ? 'PROCESSING' : 'UNKNOWN');
  const report_url = (record && record.report_url) || null;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ session_id: sessionId, domain, email, paid, status, report_url }),
  };
}