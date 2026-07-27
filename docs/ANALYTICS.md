# RankFixer Analytics Event Tracking Reference

> **Backend:** Umami (cloud.umami.is) — swappable to GA4 via `_send()` adapter in analytics.js
> **Central service:** `docs/js/analytics.js` — exposes `window.Rfx` global
> **Last updated:** 2026-07-28

---

## How to Use

```js
// Fire an event:
Rfx.track('event_name', { key: 'value' });

// Fire a conversion:
Rfx.conversion('email_signup', { source_page: '/checker' });

// Log an error:
Rfx.error('audit_failed', { endpoint: '/api/scan', message: 'timeout' });
```

**Deduplication:** Same `(event, page)` pair within 200ms is suppressed.
**Once-per-page:** `scroll_*`, `page_load_time` fire at most once per page load.
**Graceful failure:** If Umami is blocked/offline, events are silently dropped — site works normally.

---

## Event Catalog

### Page & Performance

| Event | Trigger | Parameters | Page |
|-------|---------|------------|------|
| `page_load_time` | Automatic on window.load | `load_ms` | All |
| `scroll_25` | Scroll hits 25% of page height | `scroll_depth: 25` | All |
| `scroll_50` | Scroll hits 50% | `scroll_depth: 50` | All |
| `scroll_75` | Scroll hits 75% | `scroll_depth: 75` | All |
| `scroll_100` | Scroll hits 100% | `scroll_depth: 100` | All |

### Navigation

| Event | Trigger | Parameters | Page |
|-------|---------|------------|------|
| `navigation_click` | Any `.nav-links a` click | `link_text`, `href`, `section` | All |
| `footer_cta` | Any `.site-footer a` click | `link_text`, `href` | All |

### Homepage (`/` — index.html)

| Event | Trigger | Parameters | Business Purpose |
|-------|---------|------------|-----------------|
| `hero_cta_click` | Hero primary CTA clicked | `button_text`, `section: 'hero'` | Which hero CTA converts? |
| `github_click` | GitHub link clicked (hero, nav, github_cta sections) | `button_text`, `section` | GitHub interest tracking |
| `features_expand` | Feature card clicked | `feature` (h3 text) | Which features interest users? |
| `faq_expand` | FAQ item clicked | `question` (h3 text) | Top user questions |
| `pricing_click` | "Get Full Report — $5" clicked | `button_text`, `section: 'report_cta'` | Pricing page interest |
| `learn_more` | Blog/social-proof links clicked | `button_text`, `section` | Content engagement |

### AI Visibility Checker (`/ai-visibility-checker/` — index.html)

| Event | Trigger | Parameters | Business Purpose |
|-------|---------|------------|-----------------|
| ⚡ `audit_started` | Scan button clicked | `tool_type: 'geo_checker'`, `domain`, `source` | Audit funnel: starts |
| ⚡ `audit_completed` | Results displayed | `domain`, `score`, `duration_seconds`, `recommendation_count`, `tool_type` | Audit funnel: completes |
| `visibility_check_started` | Same as audit_started | `domain` | AI visibility-specific |
| `visibility_check_completed` | Same as audit_completed | `domain`, `score`, `duration_seconds` | AI visibility-specific |
| `audit_failed` | Scan threw an error | `endpoint`, `message`, `domain` | Error rate monitoring |
| `pricing_click` | "Get Full Report — $5" clicked | `button_text`, `section: 'audit_results'`, `domain` | Funnel: audit → pricing |
| ⚡ `run_audit` | Same click (conversion) | `domain`, `score` | Marked as conversion |
| `learn_more` | Data banner/blog links | `button_text`, `section` | Content engagement |

⚡ = marked as conversion in analytics

### Full Report (`/report/` — index.html)

| Event | Trigger | Parameters | Business Purpose |
|-------|---------|------------|-----------------|
| `payment_pending` | Checkout redirect started | `domain` | Payment funnel: started |
| `payment_complete` | Payment verified, report shown | `domain` | Payment funnel: completed |
| `report_viewed` | Report fully rendered + recommendations | `domain` | Report engagement |
| `report_download` | Same as payment_complete | `report_type`, `domain` | Download tracking |
| `pricing_click` | "Pay $5" button clicked | `button_text`, `section: 'paywall'` | Paywall click rate |
| ⚡ `upgrade_plan` | Same click (conversion) | `plan: 'report_5'`, `section: 'paywall'` | Conversion: plan upgrade |

⚡ = marked as conversion

### Errors (all pages)

| Event | Trigger | Parameters | Business Purpose |
|-------|---------|------------|-----------------|
| `js_exception` | `window.onerror` / unhandled rejection | `message`, `filename`, `lineno` | JS error monitoring |
| `audit_failed` | Manual via `Rfx.error()` | `endpoint`, `status`, `message` | API/scan failures |
| `api_error` | Manual via `Rfx.error()` | `endpoint`, `status`, `message` | API error monitoring |

---

## Auto-Enriched Parameters

Every event automatically receives these standard dimensions:

| Parameter | Source | Example |
|-----------|--------|---------|
| `page` | `location.pathname` | `/ai-visibility-checker` |
| `traffic_source` | Referrer + UTM detection | `organic`, `social`, `direct`, `referral` |
| `campaign` | UTM `utm_campaign` param | `summer_launch` |
| `site_language` | Hardcoded | `en` |

---

## Conversions (Key Events)

The following events are tagged with `conversion: true` and should be marked as Key Events / Conversions in the analytics dashboard:

| Conversion Event | Funnel Stage |
|-----------------|-------------|
| `run_audit` | Acquisition: visitor starts an audit |
| `audit_completed` | Engagement: audit finishes successfully |
| `email_signup` | Conversion: email captured |
| `waitlist_join` | Conversion: waitlist signup |
| `demo_request` | Conversion: demo requested |
| `contact_form_submit` | Conversion: contact form submitted |
| `upgrade_plan` | Monetization: paid plan purchased |

---

## Dashboard Questions This Answers

### Acquisition
- Top traffic sources → `traffic_source` param on all events
- Organic vs Direct vs Social → auto-detected from referrer
- Campaign performance → `campaign` param from UTM
- Geographic distribution → Umami built-in (no PII)

### Engagement
- Most viewed pages → Umami built-in page views
- Scroll depth → `scroll_25/50/75/100` events
- CTA click-through rate → `hero_cta_click` / `pricing_click` vs page views
- Feature usage → `features_expand`, `faq_expand`
- Tool adoption → `audit_started` count

### Product Analytics
- Number of audits → count of `audit_started`
- Audit completion rate → `audit_completed` / `audit_started`
- Recommendation generation rate → `recommendation_count` param
- Average audit score → `score` param on `audit_completed`
- Average recommendations per audit → `recommendation_count` param

### Conversion
- Visitor → Audit: `audit_started` / page views
- Audit → Signup: `email_signup` / `audit_completed`
- Signup → Demo: `demo_request` / `email_signup`
- Overall funnel: page_view → audit_started → audit_completed → pricing_click → upgrade_plan → payment_complete

---

## Files Modified

| File | Changes |
|------|---------|
| `docs/js/analytics.js` | Rewrote as centralized `Rfx` service with queue, dedup, error tracking, scroll tracking, performance capture, auto-enrich params, conversion tagging |
| `docs/index.html` | Added tracking script block: hero_cta, nav, features, FAQ, GitHub, pricing, footer events |
| `docs/ai-visibility-checker/index.html` | Added `audit_started`, `audit_completed`, `visibility_check_*`, `audit_failed`, nav, footer events; upgraded legacy `trackEvent` calls |
| `docs/report/index.html` | Added pay button, sign-in/out, nav, footer tracking; upgraded legacy `trackEvent` to `Rfx.track` |
| `docs/ANALYTICS.md` | This document |

---

## Verification

### In Umami Dashboard (cloud.umami.is)
1. Open the RankFixer website dashboard
2. Go to **Events** tab — events appear within ~60 seconds
3. Filter by event name to see event-specific data
4. Check **Realtime** to verify events fire live

### Manual Smoke Test
```bash
# 1. Open site with browser DevTools Console
# 2. Check Rfx is loaded:
typeof Rfx   # should return "object"
Rfx.track    # should return a function

# 3. Fire a test event:
Rfx.track('test_event', { test: true })

# 4. Check Umami dashboard Events tab — should appear within 60s
```

### Non-blocking
- If Umami is blocked (ad blocker), the `Rfx` API still loads and accepts events; they're silently dropped.
- The site functions identically with or without analytics.
- No console errors on any page.
