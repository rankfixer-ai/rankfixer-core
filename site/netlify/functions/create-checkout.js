// Netlify Function: Stripe Checkout session for the $99 report.
// Path: site/netlify/functions/create-checkout.js
// Requires env: STRIPE_SECRET_KEY. Optional: STRIPE_PRICE_ID, SUCCESS_URL, CANCEL_URL.
// Requires `stripe` in site/package.json dependencies.
import Stripe from 'stripe';

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'method_not_allowed' }) };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'STRIPE_SECRET_KEY is not configured' }) };
  }

  // Domain the customer is purchasing a report for (sent by startCheckout()).
  let domain = '';
  try {
    const body = JSON.parse(event.body || '{}');
    domain = (body.domain || '').trim();
  } catch (_) {}

  const stripe = new Stripe(secretKey);
  const siteUrl = process.env.URL || 'https://rankfixer.co';
  const successUrl = process.env.SUCCESS_URL || (siteUrl + '/success.html');
  const cancelUrl = process.env.CANCEL_URL || (siteUrl + '/cancel.html');
  const priceId = process.env.STRIPE_PRICE_ID;

  try {
    const lineItems = priceId
      ? [{ price: priceId, quantity: 1 }]
      : [{
          price_data: {
            currency: 'usd',
            unit_amount: 9900,
            product_data: { name: 'RankFixer Full AI Visibility Report' },
          },
          quantity: 1,
        }];

    // Pass the session id through the success redirect so success.html can look it up.
    const sep = successUrl.includes('?') ? '&' : '?';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      client_reference_id: domain || undefined,
      metadata: { domain },
      success_url: successUrl + sep + 'session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    return { statusCode: 200, headers, body: JSON.stringify({ url: session.url, id: session.id }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'checkout_failed', detail: String((e && e.message) || e).slice(0, 200) }) };
  }
}