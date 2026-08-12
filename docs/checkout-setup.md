# RankFixer - Stripe Checkout + Report Delivery Setup & Test Runbook

This branch (`fix/pricing-integrity-reconcile`) ships a real Stripe Checkout flow for the $99 one-time report, plus an automated report-generation queue (Resend email + scheduled function). This guide walks through setup and a live end-to-end test.

---

## How the flow works

```
Buy button ("Get the Report -> $99")
   -> startCheckout()  (site/checkout.js)
   -> POST /.netlify/functions/create-checkout  (attaches domain to the session)
   -> Stripe Checkout session created (server-side)
   -> browser redirects to checkout.stripe.com
   -> user pays
   -> Stripe redirects to /success.html?session_id=cs_xxx
        -> success.html polls /.netlify/functions/get-session (status + report link)

   (in parallel) Stripe POSTs checkout.session.completed to /.netlify/functions/webhook
        -> webhook verifies signature + stores { domain, email, status: "PROCESSING" } to Netlify Blobs

   (every 5 min) scheduled function process-queue scans Blobs for "PROCESSING" sessions
        -> runs the analyzer against the domain
        -> renders an HTML report (dark theme)
        -> stores the report in Blobs
        -> emails the customer (Resend)
        -> marks the session "COMPLETED" with a report_url
```

**Functions** (per `netlify.toml`: `base = "site"`, `functions.directory = "netlify/functions"`):

| Function | Endpoint URL | Notes |
| :--- | :--- | :--- |
| `create-checkout` | `https://<site>/.netlify/functions/create-checkout` | POST, creates the Stripe session |
| `get-session` | `https://<site>/.netlify/functions/get-session?session_id=cs_...` | Returns domain/email/paid/status/report_url |
| `webhook` | `https://<site>/.netlify/functions/webhook` | Stripe webhook, stores PROCESSING record |
| `get-report` | `https://<site>/.netlify/functions/get-report?session_id=cs_...` | Serves the generated HTML report |
| `process-queue` | scheduled (cron `*/5 * * * *`) | Not called over HTTP; runs on Netlify's cron |

> The webhook endpoint is `/.netlify/functions/webhook` - **not** `/api/webhook`.

There is **no `/checkout` page**. The buy button calls `startCheckout()` directly, which POSTs to `create-checkout` and redirects the browser to Stripe.

---

## 1. Environment variables

Netlify Dashboard -> your site -> **Site configuration -> Environment variables**.

| Variable | Required | Value | Where to get it |
| :--- | :--- | :--- | :--- |
| `STRIPE_SECRET_KEY` | yes | `sk_test_...` (test) / `sk_live_...` (live) | Stripe Dashboard -> Developers -> API keys |
| `STRIPE_WEBHOOK_SECRET` | yes (for webhook) | `whsec_...` | Stripe Dashboard -> Developers -> Webhooks -> your endpoint -> "Signing secret" |
| `RESEND_API_KEY` | yes (for email) | `re_...` | resend.com -> API Keys |
| `RESEND_FROM_EMAIL` | yes (for email) | e.g. `reports@rankfixer.co` | A sender domain you verified in Resend |
| `STRIPE_PRICE_ID` | optional | `price_...` | Stripe Dashboard -> Products -> your $99 product -> Pricing -> API ID |
| `SUCCESS_URL` | optional | e.g. `https://<site>/success.html` | defaults to `<site>/success.html` |
| `CANCEL_URL` | optional | e.g. `https://<site>/cancel.html` | defaults to `<site>/cancel.html` |

If `STRIPE_PRICE_ID` is **not** set, `create-checkout` falls back to a hardcoded **$99.00 one-time** line item (9900 cents, "RankFixer Full AI Visibility Report").

If `RESEND_API_KEY` / `RESEND_FROM_EMAIL` are **not** set, the pipeline still runs end to end (report is generated and stored) but the email step is skipped with an `EMAIL_SKIPPED` log. Set both to enable delivery.

> Never paste keys into chat. Set them only in the Netlify dashboard. Test with `sk_test_` keys first.

---

## 2. Create the $99 product (if you don't have one)

**Option A - Stripe Dashboard:** Products -> Add product -> name "AI Readiness Report" -> one-time price **$99.00 USD** -> copy the price's API ID (`price_...`).

**Option B - Stripe CLI:**

```bash
stripe products create --name="AI Readiness Report" --description="Full AI visibility audit for your domain"
# -> note the product id (prod_...)

stripe prices create --product=prod_xxx --unit-amount=9900 --currency=usd
# -> note the price id (price_...)
```

---

## 3. Register the webhook endpoint

Stripe Dashboard -> **Developers -> Webhooks -> Add endpoint**.

| Field | Value |
| :--- | :--- |
| **Endpoint URL** | `https://<site>/.netlify/functions/webhook` |
| **Events** | `checkout.session.completed` |
| **API version** | default (latest) |

After saving, copy the **Signing secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.

---

## 4. Deploy the branch

Push the branch (or trigger a deploy) so the env vars + functions + the scheduled function config are live:

```bash
git push origin fix/pricing-integrity-reconcile
# or trigger a deploy from the Netlify dashboard
```

Note: the scheduled function (`process-queue`) is declared in `netlify.toml` under `[functions."process-queue"]` with `schedule = "*/5 * * * *"`. It requires the branch to be deployed (scheduled functions run on the site's production branch config).

---

## 5. Live checkout test

1. Visit `https://<site>/`.
2. Click **"Get the Report -> $99"** (any buy button wired to `startCheckout()`).
3. Confirm you land on `checkout.stripe.com` showing **"RankFixer Full AI Visibility Report - $99.00"** (or your product name if using `STRIPE_PRICE_ID`).
4. Pay with a **test card**:

| Card | Expiry | CVC | Result |
| :--- | :--- | :--- | :--- |
| `4242 4242 4242 4242` | any future | any | Success |
| `4000 0000 0000 0002` | any future | any | Declined (error path) |

5. On success you should redirect to `/success.html`. On cancel, `/cancel.html`.
6. Verify the webhook fired: Netlify -> **Functions -> webhook -> Logs**, look for `PAYMENT_STORED` / `PAYMENT_COMPLETE` with `status: "PROCESSING"`.
7. Wait for the next scheduled run (up to 5 min). Check Netlify -> **Functions -> process-queue -> Logs** for `REPORT_COMPLETED` and (if email is configured) `EMAIL_SENT`.
8. Refresh `/success.html` - it should now show "Your report is ready" with a link to `get-report`.
9. Check your inbox for the Resend email with the report link.

---

## 6. What happens on payment

1. `webhook.js` verifies the Stripe signature and writes the session to **Netlify Blobs** (store `checkout_sessions`, keyed by `session_id`) with domain, email, amount, and `status: "PROCESSING"`, then returns 200 immediately (well under Stripe's timeout).
2. Every 5 minutes, `process-queue.js` (scheduled) scans the store for `PROCESSING` records. For each:
   - runs the analyzer (`score.js` scoring functions) against the customer's domain,
   - renders a self-contained HTML report (`helpers/render-report.js`),
   - stores the report in the `reports` store (keyed by `session_id`),
   - sets `status: "COMPLETED"` + `report_url`,
   - emails the customer (`helpers/email-template.js` via Resend).
   - On failure, it retries up to 3 attempts, then marks `FAILED`.
3. `success.html` polls `get-session` every 8s. `get-session` reads identity from Stripe and status/report_url from Blobs. When `COMPLETED`, it shows the report link.

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
| `EMAIL_SKIPPED` in process-queue logs | `RESEND_API_KEY` / `RESEND_FROM_EMAIL` missing | Set both, redeploy |
| `EMAIL_FAILED` in logs | Resend rejects the sender | Verify `RESEND_FROM_EMAIL` uses a domain verified in Resend |
| `MARKED_FAILED analyzer_blocked` | customer's domain blocks our bot (403) | Manual follow-up; the domain is not accessible to the analyzer |
| Scheduled function never runs | branch not deployed / schedule not active | Confirm `netlify.toml` has the schedule and the branch is deployed |

---

## 8. After a successful test

```bash
git checkout main
git merge fix/pricing-integrity-reconcile
git push origin main
```

Then switch to `sk_live_` keys + a live Resend sender, and go live for real sales.

---

## 9. Local dev (optional, Stripe CLI)

```bash
stripe login
stripe listen --forward-to localhost:8888/.netlify/functions/webhook
# then run: netlify dev  (functions served under /.netlify/functions/)
```

Note: the scheduled function (`process-queue`) runs on Netlify's cron and is not part of `netlify dev`. To test the queue locally, invoke its logic directly (or trigger it from the Netlify dashboard's function editor).