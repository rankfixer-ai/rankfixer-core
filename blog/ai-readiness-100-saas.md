---
title: "We Analyzed the AI Readiness of 100 Top SaaS Websites (Data + Open Source Code)"
description: "We ran 100 B2B SaaS websites through RankFixer's AI Visibility engine. Average score 62.7/100; schema markup is the biggest gap. Full dataset, methodology, and open-source code."
date: 2026-08-13
author: "RankFixer Team"
tags: ["GEO", "AI Visibility", "SaaS", "LLM", "Open Source", "Data", "Research"]
category: "Research"
featured_image: "/images/blog/saas-ai-readiness-2026.png"
canonical_url: "https://rankfixer.co/blog/ai-readiness-100-saas"
schema_type: "ScholarlyArticle"
---

# We Analyzed the AI Readiness of 100 Top SaaS Websites (Data + Open Source Code)

**Executive Summary:** We ran the websites of 100 B2B SaaS companies through RankFixer's AI Visibility engine. Of those, **90 were fully analyzed** (9 blocked our crawler, 1 was unreachable). The result: an **average score of 62.7/100** — and the biggest gap is structured schema markup, not content or technical foundations.

We're open-sourcing the entire dataset, the methodology, and the analysis code.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## The Data at a Glance

| Metric | Value |
| :--- | :--- |
| **Domains Analyzed** | 90 (of 100; 9 blocked + 1 unreachable) |
| **Average AI Visibility Score** | 62.7/100 |
| **Median Score** | 63/100 |
| **Sites Scoring 81+ ("Excellent")** | 6 (6.7%) |
| **Sites Scoring 61–80 ("Good")** | 45 (50%) |
| **Highest Score** | 91 (Teamwork.com) |
| **Lowest Score** | 25 (Ramp) |

**Score Distribution:**
- **81–100 (Excellent):** 6 sites — 6.7%
- **61–80 (Good):** 45 sites — 50%
- **41–60 (Fair):** 37 sites — 41.1%
- **21–40 (Poor):** 2 sites — 2.2%
- **0–20 (Critical):** 0 sites — 0%

---

## What is "AI Visibility"? (The Methodology)

Traditional SEO measures keywords and backlinks. **AI Visibility — Generative Engine Optimization (GEO)** — measures how easily a Large Language Model can extract, comprehend, and cite your website as a factual source.

Using the open-source **[RankFixer Core engine](https://github.com/rankfixer-ai/rankfixer-core)**, we scored each domain on **6 measured signals:**

| Signal | Weight | What We Measured |
| :--- | :--- | :--- |
| **Schema Markup** | 25% | JSON-LD blocks and `@type` markers (Organization, FAQPage, WebSite, Product, Article, HowTo) |
| **Entity Signals** | 20% | `@id` references, `sameAs` links, brand markup, Open Graph / Twitter Card tags |
| **Content Depth** | 20% | Word count, FAQ-style headings, lists/tables, meta description |
| **Structure** | 15% | Heading hierarchy, `nav`/`main` landmarks, microdata markers |
| **Crawlability** | 10% | Homepage HTTP 200 + `robots.txt` presence |
| **llms.txt** | 10% | Presence of an `llms.txt` file at the domain root |

Each site received a composite 0–100 score.

---

## 3 Findings from the Data

### 1. Schema Markup Is the Biggest Gap

**Finding:** The average schema score is just **26.6/100** — the lowest of all six signals. Most SaaS homepages ship little or no structured schema, even as content, structure, and crawlability all score 80+.

**What this means for AI:** LLMs rely on specific schema types to generate step-by-step answers and feature comparisons. Without `Organization`, `WebSite`, and `FAQPage` markup, your content is harder for models to parse and cite.

**The Fix:** Add JSON-LD `Organization` + `WebSite` schema (and `FAQPage` where relevant) to your homepage.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "What is [your product]?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "[Clear, concise definition. One paragraph. No fluff.]"
    }
  }]
}
</script>
```

**[Check your site's schema now — free](https://rankfixer.co/ai-visibility-checker)**

---

### 2. llms.txt Has Gone Mainstream

**Finding:** **65 of 90 domains (72%)** now publish an `llms.txt` file — a lightweight map for AI crawlers that was nearly nonexistent two years ago. Adoption among top SaaS has clearly tipped.

**What this means:** llms.txt is no longer a differentiator; it's table stakes. The 28% that still lack one are falling behind.

**The Fix:** Publish an `llms.txt` at your domain root. It's a plain-text file that points AI crawlers at your key pages and content.

---

### 3. The Floor Has Risen

**Finding:** The median score is **63/100**, and **no analyzed domain scored below 21**. The weakest sites score "Poor" (21–40), not "Critical" (0–20). The days of "one-third of SaaS is invisible to AI" are over for this cohort — most of the gap is now in the last 20–30 points of schema and entity work.

**What this means for you:** The barrier to strong AI visibility has moved up. The remaining gap is structured data and entity linking, not the fundamentals.

---

## The Top 5 Performers

| Rank | Domain | Score | Tier |
| :--- | :--- | :--- | :--- |
| 1 | **teamwork.com** | 91 | Excellent |
| 2 | **hubspot.com** | 83 | Excellent |
| 3 | **woocommerce.com** | 83 | Excellent |
| 4 | **heroku.com** | 83 | Excellent |
| 5 | **zapier.com** | 81 | Excellent |

---

## The Bottom 5 (of the analyzed set)

| Domain | Score | Tier |
| :--- | :--- | :--- |
| ramp.com | 25 | Poor |
| dropbox.com | 29 | Poor |
| cloud.google.com | 43 | Fair |
| dbt.com | 44 | Fair |
| airtable.com | 44 | Fair |

> Note: a few domains show intermittent anti-bot behavior between runs — dropbox.com scored 71 in one pass and 29 in another. See the methodology note below.

---

## Excluded Domains (could not analyze)

These 10 domains returned an access-denied or timeout response to the RankFixerBot and are excluded from the statistics rather than assigned a misleading low score:

- **Blocked (HTTP 403):** perplexity.ai, midjourney.com, canva.com, freshworks.com, convertkit.com, tableau.com, gusto.com, zendesk.com, udemy.com
- **Unreachable (timeout):** coursera.com

---

## How to Improve Your AI Visibility Score

### The 5-Minute Fix (Do This Today)
1. **Create `llms.txt`** at your domain root if you don't have one (28% still don't)
2. **Keep AI crawlers reachable** — 10 domains in this set block us entirely
3. **Add `Organization` + `WebSite` schema** to your homepage

### The 1-Hour Fix
4. **Add `FAQPage` schema** to your top 5 pages
5. **Add `@id`/`sameAs` entity links** to connect your brand to authoritative sources

### The Full Optimization
6. **Add `Product`, `Article`, and `HowTo` schemas** across your site
7. **Build a knowledge graph** with `@id` references linking entities across pages
8. **Publish original research** — AI models disproportionately cite data-backed content
9. **Monitor weekly** — your score changes as both your site and the models evolve

**[Get your personalized Quick Win — free 30-second scan](https://rankfixer.co/ai-visibility-checker)**

---

## Download the Open-Source Dataset

Transparency is core to our mission. The complete dataset, methodology, and analysis code are fully open-source under the MIT license.

- **[View `top_100_saas_scores.json` on GitHub](https://github.com/rankfixer-ai/rankfixer-core/blob/main/data/top_100_saas_scores.json)** — full dataset with per-signal scores
- **[Read the Full Benchmark Report](https://github.com/rankfixer-ai/rankfixer-core/blob/main/data/benchmark_report.md)** — executive summary, signal-by-signal analysis
- **[Run the batch analyzer](https://github.com/rankfixer-ai/rankfixer-core/blob/main/tools/batch-analyze.js)** — reproduce the scores yourself
- **[Fork `rankfixer-core`](https://github.com/rankfixer-ai/rankfixer-core)** — run your own analyses or build on the engine

*If you're a developer, data scientist, or SEO researcher: fork the repo, run your own queries against any domain, and contribute to the engine.*

---

## Signal-by-Signal Breakdown

| Signal | Weight | Average Score |
| :--- | :--- | :--- |
| Schema Markup | 25% | 26.6 |
| Entity Signals | 20% | 61.3 |
| Content Depth | 20% | 80.3 |
| Structure | 15% | 82.5 |
| Crawlability | 10% | 80.0 |
| llms.txt | 10% | 72.2 |

**The story in one table:** fundamentals (content, structure, crawlability) are strong across the board. The gap is concentrated in schema markup (26.6) — the highest-weighted signal — and, to a lesser degree, entity linking (61.3).

---

## Methodology Details

- **Engine:** [RankFixer Core](https://github.com/rankfixer-ai/rankfixer-core) (`site/netlify/functions/score.js`)
- **Date Analyzed:** August 2026
- **Sample:** 100 curated SaaS domains (`data/domains_to_analyze.txt`)
- **Signals Evaluated:** 6 weighted signals (see methodology above)
- **Scoring:** Weighted composite, normalized to 0–100
- **Method:** fetch homepage + `robots.txt` + `llms.txt` (RankFixerBot user agent), parse HTML, score
- **Exclusions:** blocked (HTTP 401/403/406/418/429) and unreachable domains are marked and excluded from averages
- **Limitations:** English-language only, point-in-time snapshot, single-pass crawl

---

## Share the Data

If you found this analysis useful, please share it:

**LinkedIn:** *"We analyzed 100 SaaS companies' AI visibility. Average score: 62.7/100 — schema markup is the biggest gap. Here's the full open-source dataset."*

**Twitter/X:** *"We scored 100 SaaS sites for AI visibility and open-sourced everything. Schema markup is the #1 gap (avg 26.6/100)."*

**Cite the data:**
> RankFixer. (2026). *Top 100 SaaS AI Visibility Scores.* Retrieved from https://github.com/rankfixer-ai/rankfixer-core

---

## How Does Your Site Compare?

The remaining gap in AI visibility is structured data and entity linking — both cheap to fix and highly weighted. Don't guess whether ChatGPT understands your site.

**[Run Your Free AI Visibility Scan](https://rankfixer.co/ai-visibility-checker)**

*Get your exact score in 30 seconds, plus a prioritized Quick Win. No signup. No credit card.*

---

*Built by the RankFixer team. If this helped you understand AI visibility, give us a [star on GitHub](https://github.com/rankfixer-ai/rankfixer-core).*

---

**Last Updated:** August 13, 2026
**Data Source:** [RankFixer Core](https://github.com/rankfixer-ai/rankfixer-core)
**License:** MIT — free to use, modify, and distribute with attribution.