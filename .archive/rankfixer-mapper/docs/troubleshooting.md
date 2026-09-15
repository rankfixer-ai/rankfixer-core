# Troubleshooting — RankFixer Mapper v2

**Engine Status: Production-Parity Mode** (2026-07-03)

Last updated: 2026-07-03
Status legend: CONFIRMED (evidence in soak logs) · SUSPECTED (partial evidence) · UNCONFIRMED (no evidence found in reviewed logs — needs manual check)

**Active issues:** Bug 5 (bot-challenge detection) · Issues 6–9 (unconfirmed — needs test runs)
**Closed issues:** Bug 1 (self-canonical) · Bug 2 (template refinement) · Bug 3 (singleton collapse) · Bug 4 (sitemap regression)

---

## Bug 4 — Silent sitemap-discovery failure with graceful fallback [FIXED — VERIFIED]

**Severity: Critical.** Root cause: logic gap in `url-discoverer.js` `fetchSitemap()` at line 58.
When a sitemap INDEX was detected (has `<sitemap>` blocks, not `<url>` blocks), the code logged
the child sitemap count but never extracted their `<loc>` URLs or fetched them. `parseSitemapXml()`
then searched for `<url>` blocks in the index XML, found none, and returned 0 entries. The function
fell through all 3 sitemap URL candidates and returned `[]`.

**Fix:** Extracted fetch-and-parse logic into a new recursive `fetchAndParseSitemap(url, baseParsed, depth)`.
When an index is detected, child sitemap `<loc>` URLs are extracted and fetched concurrently (with
`depth > 3` circular-reference guard). When a regular sitemap is detected, `parseSitemapXml()` is
called normally.

**Verification:** Allbirds baseline re-tested post-fix — 2,327 sitemap URLs returned (1 overlap with
crawl = 2,326 unique), matching the pre-regression golden state exactly.

---

## Bug 5 — Target returning 429 / bot-challenge page audited as real content [CONFIRMED — OPEN]

**Severity: Critical.** Same category of problem as Bug 4: silent failure that produces a
plausible-looking but meaningless report.

**Evidence:** A direct fetch to `https://www.allbirds.com` during this session returned a 429 /
Cloudflare challenge page. A subsequent audit run against the same target classified it as
`archetype=brochure`, found 1 URL, and saved a full report with 0 template issues and 1
contradiction — i.e., it audited the Cloudflare challenge page as if it were the real site,
with no indication in the output that this happened.

**Not yet done:**
- Add response validation: reject/flag audits where status ≥ 400, or where the response body matches
  known bot-challenge patterns (e.g., "Verifying your connection", CAPTCHA markers) before proceeding
  to classification.
- Decide whether a blocked/challenged fetch should hard-fail the audit or trigger a retry-with-backoff.

---

## Bug 1 — Self-canonical flagged as reciprocal-canonical [FIXED, per session log]

**Evidence:** Live-edited `contradiction-engine.js` during this session to skip canonical checks where
`node.canonical === identity`. Session output states "Bug 1 fixed: self-canonical no longer flagged as
reciprocal." Not independently re-verified against a fresh full run post-fix (the runs immediately after
were affected by Bug 4/5 above, so template-level canonical behavior wasn't cleanly re-tested at scale).

**Action needed:** Once Bug 4 is resolved and a full-coverage run is possible again, re-verify this fix
against Allbirds at full scale (the original run had ~172 critical reciprocal-canonical false positives).

---

## Bug 2 — Template refinement over-triggering on price strings [FIXED, per session log]

**Evidence:** Session output states "Bug 2 fixed: refinement now requires product schema, not just price
strings." Not independently re-verified at full scale, for the same reason as Bug 1.

---

## Bug 3 — Single-instance pages not collapsed into catch-all template [FIXED, per session log]

**Evidence:** Session output states "Bug 3 fixed: single-instance pages collapsed into catch-all."
Visible in the later soak run: templates dropped from 91 (mostly instanceCount:1) down to 3 templates
per site, consistent with the fix. This one has actual behavioral evidence supporting it, unlike Bugs 1–2.

---

## Issue 6 — Puppeteer / Chrome dependency [UNCONFIRMED — no evidence found]

No Puppeteer-related errors, install checks, or Chrome references appear in any reviewed session log.
`requiresJSRendering` was reported as `false` for every site tested (Allbirds, Google Search Blog,
GitHub Docs), so the Puppeteer code path was never exercised in these runs.

**Action needed:** Run `node -e "require('puppeteer')"` and `npx puppeteer browsers list` directly, and
test against a site that requires JS rendering (`requiresJSRendering: true`) to actually exercise this path.

---

## Issue 7 — Locale query parameters on crawled URLs [UNCONFIRMED — no evidence found]

No locale/query-param artifacts (`?lang=`, `?locale=`, etc.) appear in any URL in the reviewed logs.

**Action needed:** Test against a multi-locale site (many e-commerce sites, e.g. international retailers,
are good candidates) and inspect the discovered URL list for locale-param duplicates.

---

## Issue 8 — Non-deterministic JS-rendering classification [UNCONFIRMED — no evidence found]

No repeated same-URL classification runs were captured in the reviewed logs to test for flapping.
`requiresJSRendering` was `false` and consistent across the (different) runs shown, but no site was
run twice back-to-back to isolate determinism.

**Action needed:** Run `site-classifier.js` against the same URL twice in immediate succession and diff
output, per the earlier suggested test.

---

## Issue 9 — Shallow crawl fallback limit (20 pages) [CONFIRMED — design limitation]

When sitemap discovery fails (Bug 4) or no sitemap exists, the crawl fallback is hard-coded to 20
pages. This is insufficient for any real-world site and produces misleading reports that appear complete
but cover <1% of the site.

**Action needed:**
- Increase the crawl-only fallback to a configurable parameter (default: 200).
- Add a prominent warning in the report when coverage is crawl-only vs. sitemap-backed.
- Surface the sitemap-vs-crawl coverage ratio in the report summary.

---

## Summary / gating recommendation

Do not publish soak-test results, "0% false positive" claims, or any proof table until:
1. Bug 4 (sitemap discovery) is root-caused and fixed — current results reflect <1% site coverage
   for Allbirds, not full coverage.
2. Bug 5 (bot-challenge pages audited as real content) has response validation added.
3. Bugs 1–3 are re-verified at full scale once Bug 4 is fixed.
4. Issues 6–8 (Puppeteer, locale, JS-rendering-determinism) are each given at least one real test
   run — currently no evidence either way.
5. Issue 9 (shallow crawl fallback) is addressed so crawl-only audits don't silently masquerade as
   complete.

**Trusted artifact:** The only verified, full-coverage result is:
`rankfixer-mapper/results/allbirds/v2-audit-allbirds-(e-commerce)-1783084116525.json`
(2,326 pages, 91 templates, 189 contradictions, 82 critical — pre-regression).

All other files from this session have been purged. 13 degraded artifacts deleted.
