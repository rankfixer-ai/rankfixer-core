# Archived Code

This directory contains code that was part of an earlier architectural vision for RankFixer but was never wired into the live product.

## What's Here

### `.archive/platform/`
- `worker.js` — stub audit worker (never imported by production)
- `engine-bridge.js` — RPES governance layer + real runSEOAudit (never imported)
- `api-server.js`, `bridge-server.js` — local development server (not used in production)
- `dashboard.html`, `dashboard-interactions.js` — local dev dashboard
- Other platform utilities

### `.archive/rankfixer-mapper/`
- `rankfixer-bridge.js` — duplicate RPES formula + bridgeAuditResults (never imported)
- `audit-report-v2.js` — deep audit pipeline (never imported by live code)
- `run-audit-cli.js` — CLI wrapper (never imported)
- `test-v2.js` — standalone QA checks (not wired into test suite)
- Other mapper utilities

### `.archive/src/`
- `rankfixer_core/` — Python bridge package (can't be imported by JS production code)

## Why It's Archived, Not Deleted

The RPES formula in `engine-bridge.js` and `rankfixer-bridge.js` is mathematically correct and tested. It may be useful if RankFixer ever builds a backend platform. Archiving keeps it recoverable without cluttering the active codebase.

## What's Live

The actual production code is:

- `site/netlify/functions/score.js` — the only live scoring engine
- Implements a 6-signal model: Schema (25%), Entity (20%), Content (20%), Structure (15%), Crawlable (10%), llms.txt (10%)
- Deployed to Netlify at `rankfixer.co/ai-visibility-checker`
- Zero imports from `platform/` or `rankfixer-mapper/`
