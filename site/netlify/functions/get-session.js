// Netlify Function: retrieve a completed checkout session for the success page.
// Path: site/netlify/functions/get-session.js
// Requires env: STRIPE_SECRET_KEY.
// Reads the session from Stripe directly (authoritative + instant) to avoid the
// race where success.html loads before the webhook has written the Blob.
import Stripe from 'stripe';

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
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const email = session.customer_details && session.customer_details.email;
    const domain = session.client_reference_id || (session.metadata && session.metadata.domain) || '';
    const paid = session.payment_status === 'paid';
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        session_id: session.id,
        domain,
        email,
        paid,
        amount_total: session.amount_total,
      }),
    };
  } catch (e) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'session_not_found' }) };
  }
}