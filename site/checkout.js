// Frontend helper: redirect to Stripe Checkout for the $99 report.
// Include this file, then call startCheckout() from your "buy" button.
// Usage: <button onclick="startCheckout()">Pay $99</button>
async function startCheckout(options) {
  options = options || {};
  var btn = options.button;
  var originalLabel = options.buttonLabel || 'Pay $99';
  if (btn) { btn.disabled = true; btn.textContent = 'Redirecting...'; }
  try {
    var res = await fetch('/.netlify/functions/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: options.domain || '' }),
    });
    var data = await res.json();
    if (data && data.url) {
      window.location.href = data.url;
      return;
    }
    console.error('Checkout failed:', data && data.error, data && data.detail);
    if (options.onError) options.onError(data && data.error);
  } catch (e) {
    console.error('Checkout error:', e);
    if (options.onError) options.onError('network_error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
  }
}
