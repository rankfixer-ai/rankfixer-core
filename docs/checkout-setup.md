# RankFixer — Stripe Checkout Setup & Test Runbook

This branch (`fix/pricing-integrity-reconcile`) ships a real Stripe Checkout flow for the $99 one-time report. This guide walks through the exact setup and a live test, end to end.

---

## How the flow works

```
Buy button ("Get the Report → $99")
   → startCheckout()  (site/checkout.js)
   → POST /.netlify/functions/create-checkout
   → Stripe Checkout session created (server-side)
   → browser redirects to checkout.stripe.com
   → user pays
   → Stripe redirects to /success.html  (or /cancel.html)
   → Stripe POSTs checkout.session.completed to /.netlify/functions/webhook
   → webhook verifies signature + logs PAYMENT_COMPLETE
```

**Functions** (per `netlify.toml`: `base = "site"`, `functions.directory = "netlify/functions"`):

| Function | Endpoint URL |
| :--- | :--- |
| `create-checkout` | `https://<site>/.netlify/functions/create-checkout` |
| `webhook` | `https://<site>/.netlify/functions/webhook` |

> ⚠️ The webhook endpoint is `/.netlify/functions/webhook` — **not** `/api/webhook`.

There is **no `/checkout` page**. The buy button calls `startCheckout()` directly, which POSTs to `create-checkout` and redirects the browser to Stripe.

---

## 1. Environment variables

Netlify Dashboard → your site → **Site configuration → Environment variables**.

| Variable | Required | Value | Where to get it |
| :--- | :--- | :--- | :--- |
| `STRIPE_SECRET_KEY` | ✅ | `sk_test_...` (test) / `sk_live_...` (live) | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | ✅ (for webhook) | `whsec_...` | Stripe Dashboard → Developers → Webhooks → your endpoint → "Signing secret" |
| `STRIPE_PRICE_ID` | optional | `price_...` | Stripe Dashboard → Products → your $99 product → Pricing → API ID |
| `SUCCESS_URL` | optional | e.g. `https://<site>/success.html` | defaults to `<site>/success.html` |
| `CANCEL_URL` | optional | e.g. `https://<site>/cancel.html` | defaults to `<site>/cancel.html` |

If `STRIPE_PRICE_ID` is **not** set, `create-checkout` falls back to a hardcoded **$99.00 one-time** line item (9900 cents, "RankFixer Full AI Visibility Report").

> Never paste keys into chat. Set them only in the Netlify dashboard. Test with `sk_test_` keys first.

---

## 2. Create the $99 product (if you don't have one)

**Option A — Stripe Dashboard:** Products → Add product → name "AI Readiness Report" → one-time price **$99.00 USD** → copy the price's API ID (`price_...`).

**Option B — Stripe CLI:**

```bash
stripe products create --name="AI Readiness Report" --description="Full AI visibility audit for your domain"
# → note the product id (prod_...)

stripe prices create --product=prod_xxx --unit-amount=9900 --currency=usd
# → note the price id (price_...)
```

---

## 3. Register the webhook endpoint

Stripe Dashboard → **Developers → Webhooks → Add endpoint**.

| Field | Value |
| :--- | :--- |
| **Endpoint URL** | `https://<site>/.netlify/functions/webhook` |
| **Events** | `checkout.session.completed` |
| **API version** | default (latest) |

After saving, copy the **Signing secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.

---

## 4. Deploy the branch

Push the branch (or trigger a deploy) so the env vars + functions are live:

```bash
git push origin fix/pricing-integrity-reconcile
# or trigger a deploy from the Netlify dashboard
```

---

## 5. Live checkout test

1. Visit `https://<site>/`.
2. Click **"Get the Report → $99"** (any buy button wired to `startCheckout()`).
3. Confirm you land on `checkout.stripe.com` showing **"RankFixer Full AI Visibility Report — $99.00"** (or your product name if using `STRIPE_PRICE_ID`).
4. Pay with a **test card**:

| Card | Expiry | CVC | Result |
| :--- | :--- | :--- | :--- |
| `4242 4242 4242 4242` | any future | any | Success |
| `4000 0000 0000 0002` | any future | any | Declined (error path) |

5. On success you should redirect to `/success.html`. On cancel, `/cancel.html`.
6. Verify the webhook fired: Netlify → **Functions → webhook → Logs**, look for `PAYMENT_COMPLETE` with the session id / email / amount.

---

## 6. What currently happens on payment (important)

`webhook.js` **verifies the Stripe signature and logs** `PAYMENT_COMPLETE`, but it does **not yet deliver the report or record the customer**. The `TODO` in `webhook.js` marks this as the next step: write the payment to Netlify Blobs / a KV store / the existing `docs/js/auth.js` recordPayment() endpoint, then email or unlock the report.

So a successful test proves **checkout + payment + webhook verification** work. **Report delivery is still a manual step** until the fulfillment code is added.

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
| :--- | :--- | :--- |
| 500 "STRIPE_SECRET_KEY is not configured" | env var missing | Set `STRIPE_SECRET_KEY`, redeploy |
| Stripe shows "No such price" | `STRIPE_PRICE_ID` wrong | Fix it, or unset it to use the hardcoded $99 fallback |
| Stripe says "Invalid API key" | wrong key | Set a valid `sk_test_...` key |
| Webhook returns 400 | `STRIPE_WEBHOOK_SECRET` wrong/missing | Set `whsec_...` correctly |
| Webhook 404 | endpoint URL wrong | Use `/.netlify/functions/webhook` (not `/api/webhook`) |
| No log after payment | signature mismatch or wrong URL | Verify endpoint URL + signing secret match |

---

## 8. After a successful test

```bash
git checkout main
git merge fix/pricing-integrity-reconcile
git push origin main
```

Then implement report fulfillment in `webhook.js` (the `TODO`), and switch to `sk_live_` keys + live mode for real sales.

---

## 9. Local dev (optional, Stripe CLI)

```bash
stripe login
stripe listen --forward-to localhost:8888/.netlify/functions/webhook
# then run: netlify dev  (functions served under /.netlify/functions/)
```