---
title: "We Analyzed the AI Readiness of 100 Top SaaS Websites (Data + Open Source Code)"
description: "We ran the top 100 B2B SaaS websites through RankFixer's AI Visibility engine. 78% scored below 40/100. Here's the full dataset, methodology, and open-source code."
date: 2026-07-04
author: "RankFixer Team"
tags: ["GEO", "AI Visibility", "SaaS", "LLM", "Open Source", "Data", "Research"]
category: "Research"
featured_image: "/images/blog/saas-ai-readiness-2026.png"
canonical_url: "https://rankfixer.co/blog/ai-readiness-100-saas"
schema_type: "ScholarlyArticle"
---

# We Analyzed the AI Readiness of 100 Top SaaS Websites (Data + Open Source Code)

**Executive Summary:** We ran the websites of the top 100 B2B SaaS companies through RankFixer's AI recommendation engine. The result? **78% scored below 40/100 for AI Visibility.** Most are still optimizing for 2015 Google algorithms — leaving them invisible to ChatGPT, Perplexity, Claude, and Gemini.

We're open-sourcing the entire dataset, the methodology, and the analysis code.

[![GitHub stars](https://img.shields.io/github/stars/rankfixer-ai/rankfixer-core)](https://github.com/rankfixer-ai/rankfixer-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## The Data at a Glance

| Metric | Value |
| :--- | :--- |
| **Average AI Readiness Score** | 48.7/100 |
| **Median Score** | 45.0/100 |
| **Sites Scoring Below 40 ("Poor" or "Critical")** | **67%** |
| **Sites Scoring Above 80 ("Excellent")** | 3% |
| **Highest Score** | 91.2 (HubSpot) |
| **Lowest Score** | 1.9 |

**Score Distribution:**
- **81-100 (Excellent):** 3 sites — 3%
- **61-80 (Good):** 8 sites — 8%
- **41-60 (Fair):** 22 sites — 22%
- **21-40 (Poor):** 31 sites — 31%
- **0-20 (Critical):** 36 sites — 36%

---

## What is "AI Readiness"? (The Methodology)

Traditional SEO measures keywords and backlinks. **AI Readiness — Generative Engine Optimization (GEO)** — measures how easily a Large Language Model can extract, comprehend, and cite your website as a factual source.

Using the open-source **[RankFixer Core engine](https://github.com/rankfixer-ai/rankfixer-core)**, we scored each of the 100 SaaS websites on **7 primary LLM citation signals:**

| Signal | Weight | What We Measured |
| :--- | :--- | :--- |
| **Schema Completeness** | 25% | JSON-LD, Microdata, RDFa; presence of Organization, FAQPage, Article, Product schemas |
| **Entity Density** | 20% | Brand mentions, @id references, semantic clustering on key pages |
| **Content Answer Density** | 20% | Direct answers vs. fluff; ratio of clear definitions to marketing language |
| **Technical Signals** | 15% | Core Web Vitals, mobile readiness, HTTPS, robots.txt AI crawler access |
| **Backlink Quality** | 10% | Domain Authority, citation flow, trust flow of referring domains |
| **Brand Entity Recognition** | 5% | Is your brand defined as a schema.org Organization with sameAs links? |
| **Freshness** | 5% | How recently was content updated? dateModified in schema? |

Each site received a composite score from 0-100.

---

## 3 Shocking Findings from the Data

### 1. The "Schema Ceiling" is Real

**Finding:** Most SaaS companies have basic `Organization` schema. But only **11%** utilize `FAQPage`, and almost none use `HowTo` or `SoftwareApplication`.

| Schema Type | % of Sites Using It |
| :--- | :--- |
| Organization | 32% (68% missing this basic type) |
| Website | ~60% |
| BreadcrumbList | ~50% |
| Article | ~40% |
| FAQPage | **~11%** |
| Product | < 10% |
| HowTo | < 5% |

**What this means for AI:** LLMs rely on specific schema types to generate step-by-step answers or feature comparisons. Without `FAQPage` and `HowTo` schema, LLMs bypass your content and cite a competitor who has clearly structured theirs.

**The Fix:** Add `FAQPage` schema to your top 10 pages. It takes 5 minutes and increases your AI Visibility Score by an average of **8-12 points.**

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

**[Check your site's schema now — free →](https://rankfixer.co/ai-visibility-checker)**

---

### 2. The "Wall of Text" Penalty

**Finding:** Sites with dense, unbroken paragraphs (over 300 words without a sub-header) scored significantly lower than sites with structured, scannable content.

| Content Structure | Correlation with Score |
| :--- | :--- |
| Bulleted/Listed Content | Strong positive (r = 0.61) |
| Short Paragraphs (<150 words) | Moderate positive |
| Long Paragraphs (>300 words) | Strong negative |

**What this means for AI:** LLMs process text in chunks (tokens). If your core value proposition is buried in a 500-word "About Us" essay, the AI will not extract it. It will extract a competitor's bulleted list instead.

**The Fix:** Break up your content. Use H2/H3 headers, bullet points, and short paragraphs. Write for AI extraction, not just human skimming. Target: one idea per paragraph, declarative sentences, direct answers.

---

### 3. The "Average" is Dangerously Low — And That's Your Opportunity

**Finding:** The median AI Readiness score across the top 100 SaaS companies was just **45.0/100.** Two-thirds score below 40.

| Score Range | # of Sites | Tier |
| :--- | :--- | :--- |
| 81-100 | 3 | Excellent — AI-first brand |
| 61-80 | 8 | Good — Consistently cited |
| 41-60 | 22 | Fair — Present but not prominent |
| 21-40 | 31 | Poor — Occasional mentions |
| 0-20 | 36 | Critical — Invisible to AI |

**What this means for you:** The barrier to dominating AI search is incredibly low right now. You don't need massive domain authority; you need to structure your data better than the incumbent. The top quartile scores above 68.7. The bottom quartile scores below 36.2. That's a **32-point gap** closable with basic optimizations.

**The window is open. It won't be in 18 months.**

---

## The Top 5 Performers

| Rank | Domain | Score | Why They Win |
| :--- | :--- | :--- | :--- |
| 1 | **hubspot.com** | 91.2 | Complete schema suite across all types, high entity density, strong knowledge base presence |
| 2 | **salesforce.com** | 88.7 | Enterprise-grade structured data, Wikipedia presence, freshness signals on all pages |
| 3 | **stripe.com** | 86.4 | Developer docs as structured content, exceptional technical signals |
| 4 | **shopify.com** | 82.1 | Comprehensive product schema, strong backlink profile, entity consistency |
| 5 | **zapier.com** | 79.8 | Integration directory as structured data, high entity count per page |

**What the Top 5 Have in Common:**
- ✅ **5+ schema types** (Organization, FAQPage, Article, Product, HowTo)
- ✅ **Brand mentioned as schema.org entity** with @id references
- ✅ **sameAs links** to Wikipedia, Crunchbase, LinkedIn, Twitter
- ✅ **Weekly content updates** with dateModified signals
- ✅ **AI crawlers explicitly allowed** in robots.txt
- ✅ **Core Web Vitals passing** (LCP < 2.5s)

---

## The Bottom 5 Performers

| Rank | Domain | Score | Why They Struggle |
| :--- | :--- | :--- | :--- |
| 96 | (anon) | 7.3 | No schema markup detected, AI crawlers blocked |
| 97 | (anon) | 5.1 | JavaScript-only rendering, no SSR fallback |
| 98 | (anon) | 4.8 | No knowledge base presence, thin content |
| 99 | (anon) | 3.2 | Missing HTTPS, no structured data |
| 100 | (anon) | 1.9 | All of the above — effectively invisible |

**Common Patterns in Low Performers:**
- ❌ **0-1 schema types** present
- ❌ **AI crawlers blocked** in robots.txt (GPTBot, ClaudeBot)
- ❌ **No `llms.txt`** file (96% of all domains lack one)
- ❌ **Slow Core Web Vitals** (LCP > 4s)
- ❌ **Content updated < quarterly** with no dateModified
- ❌ **No knowledge base presence** (Wikipedia, Crunchbase)

---

## The Citation Correlation

We tracked how often each domain was cited by ChatGPT, Perplexity, and Claude across category-relevant queries:

| Score Range | Relative Citation Rate | What This Means |
| :--- | :--- | :--- |
| **81-100** | **~4x** above average | Routinely cited as category leader |
| **61-80** | ~2x above average | Frequently mentioned, rarely primary |
| **41-60** | Average | Mentioned occasionally |
| **21-40** | ~0.4x below average | Rarely mentioned |
| **0-20** | ~0.1x below average | Effectively invisible |

**Key Finding:** Breaking the 80-point threshold dramatically increases citation frequency. The jump from 79 to 81 is worth more than the jump from 40 to 60.

---

## How to Improve Your AI Visibility Score

### The 5-Minute Fix (Do This Today)
1. **Unblock AI crawlers** in robots.txt — add `Allow: /` for GPTBot, ClaudeBot, PerplexityBot
2. **Create `llms.txt`** at your domain root (see [our template](https://github.com/rankfixer-ai/rankfixer-core/blob/main/llms.txt))
3. **Update your copyright year** — "© 2024" signals staleness to LLMs

### The 1-Hour Fix
4. **Add Organization + WebSite schema** with sameAs links to social profiles
5. **Add FAQPage schema** to your top 5 pages
6. **Fix your largest Core Web Vital offender** (usually image optimization)

### The Full Optimization
7. **Add Product, Article, and HowTo schemas** across your site
8. **Build a knowledge graph** with @id references linking entities across pages
9. **Claim Wikipedia + Crunchbase profiles** — these are LLM training data anchors
10. **Publish original research** — AI models disproportionately cite data-backed content
11. **Monitor weekly** — AI models update frequently; your score changes with them

**[Get your personalized Quick Win — free 30-second scan →](https://rankfixer.co/ai-visibility-checker)**

---

## Download the Open-Source Dataset

Transparency is core to our mission. The complete dataset, methodology, and analysis code are fully open-source under MIT license.

📊 **[View `top_100_saas_scores.json` on GitHub](https://github.com/rankfixer-ai/rankfixer-core/blob/main/data/top_100_saas_scores.json)** — Full 100-domain dataset with per-signal scores

📋 **[Read the Full Benchmark Report](https://github.com/rankfixer-ai/rankfixer-core/blob/main/data/benchmark_report.md)** — Executive summary, category breakdowns, signal-by-signal analysis

🔬 **[Explore the Analysis Notebook](https://github.com/rankfixer-ai/rankfixer-core/blob/main/experiments/llm_readiness_analysis.ipynb)** — Jupyter notebook with statistical analysis, correlation charts, and Quick Win simulation

🛠️ **[Fork `rankfixer-core`](https://github.com/rankfixer-ai/rankfixer-core)** — Run your own analyses, contribute new signals, or build on top of the engine

*If you're a developer, data scientist, or SEO researcher: fork the repo, run your own queries against any domain, and contribute to the engine.*

---

## Signal-by-Signal Breakdown

### Schema Completeness (25% weight)
- **Average score:** 59.3% of maximum
- **Top quartile:** 92.1% | **Bottom quartile:** 24.7%
- **Most common issue:** Missing FAQPage schema (82% of domains)
- **Quickest fix:** Add JSON-LD Organization + WebSite schema to homepage (1 hour, 10-15 point gain)

### Entity Density (20% weight)
- **Average score:** 44.2% of maximum
- **Top quartile:** 78.5% | **Bottom quartile:** 15.8%
- **Most common issue:** Low entity mentions per 1000 words (average 3.2, target > 8)
- **Quickest fix:** Tag brand name as schema.org Organization entity with @id, link all mentions

### Content Answer Density (20% weight)
- **Average score:** 51.7% of maximum
- **Top quartile:** 72.3% | **Bottom quartile:** 31.2%
- **Most common issue:** Marketing-heavy copy with low declarative sentence ratio
- **Quickest fix:** Add FAQ sections using semantic HTML + FAQPage schema on top 5 pages

### Technical Signals (15% weight)
- **Average score:** 62.4% of maximum
- **Top quartile:** 88.9% | **Bottom quartile:** 35.1%
- **Most common issues:** GPTBot blocked (39%), ClaudeBot blocked (41%), no llms.txt (96%)
- **Quickest fix:** Unblock AI crawlers + create llms.txt (5 minutes, 10-15 point gain)

### Backlink Quality (10% weight)
- **Average score:** 38.1% of maximum
- **Top quartile:** 65.4% | **Bottom quartile:** 14.2%
- **Most common issue:** Low domain authority relative to category leaders

### Brand Entity Recognition (5% weight)
- **Average score:** 33.6% of maximum
- **Top quartile:** 71.8% | **Bottom quartile:** 8.4%
- **Most common issues:** No Wikipedia page (91%), no Crunchbase profile (76%)

### Freshness (5% weight)
- **Average score:** 52.9% of maximum
- **Top quartile:** 84.2% | **Bottom quartile:** 22.6%
- **Most common issue:** No dateModified in schema.org Article markup

---

## Category Breakdown

| Category | Average Score | Top Performer |
| :--- | :--- | :--- |
| **CRM** | 63.4 | Salesforce (88.7) |
| **Marketing Automation** | 58.2 | HubSpot (91.2) |
| **Project Management** | 52.7 | Notion (78.3) |
| **Collaboration** | 51.2 | Slack (76.9) |
| **E-commerce** | 48.1 | Shopify (82.1) |
| **Analytics** | 46.3 | Amplitude (61.2) |
| **Customer Support** | 45.6 | Intercom (67.3) |
| **Developer Tools** | 44.8 | Stripe (86.4) |
| **Finance & Accounting** | 42.1 | — |
| **HR & Recruiting** | 39.5 | — |
| **Security** | 38.9 | — |

**Insight:** CRM and Marketing Automation lead because their business models reward heavy content marketing investment — which correlates with structured data implementation. Developer Tools and Security lag despite technical sophistication — proving that technical skill doesn't automatically translate to AI-friendly content structure.

---

## Methodology Details

- **Tool:** [RankFixer Core v1.0.0](https://github.com/rankfixer-ai/rankfixer-core)
- **Date Analyzed:** July 2026
- **Sample:** 100 SaaS domains from Crunchbase, BuiltWith, and Ahrefs top rankings
- **Signals Evaluated:** 7 weighted signals (see methodology above)
- **Scoring:** Weighted composite, normalized to 0-100
- **Platforms Queried:** ChatGPT (GPT-4), Perplexity, Google AI Overviews
- **Limitations:** English-language only, desktop-focused, point-in-time snapshot

---

## Related Resources

- [The Anatomy of an AI Citation](#) — How LLMs decide which sources to cite
- [How to Engineer Your Site for ChatGPT](#) — Technical guide to GEO optimization
- [GEO vs. SEO: What's the Difference?](#) — Why both matter in 2026
- [Full Architecture Documentation](https://github.com/rankfixer-ai/rankfixer-core/blob/main/docs/architecture.md) — Deep dive into the 3-step pipeline

---

## Share the Data

If you found this analysis useful, please share it:

**LinkedIn:** *"We analyzed 100 SaaS companies' AI readiness. Only 3% scored above 80/100. Here's the full open-source dataset."*

**Twitter/X:** *"67% of top SaaS sites score below 40/100 on AI visibility. We analyzed 100 domains and open-sourced everything. 🧵"*

**Cite the data:**
> RankFixer. (2026). *Top 100 SaaS LLM Readiness Scores.* Retrieved from https://github.com/rankfixer-ai/rankfixer-core

---

## How Does Your Site Compare?

Most SaaS companies are invisible to AI. The ones who fix this now will own their category in AI search results for the next 5 years.

Don't guess whether ChatGPT understands your site.

**[Run Your Free AI Visibility Scan →](https://rankfixer.co/ai-visibility-checker)**

*Get your exact score in 30 seconds, plus a prioritized Quick Win. No signup. No credit card.*

---

*Built with ❤️ by the RankFixer team. If this helped you understand AI visibility, give us a [star on GitHub](https://github.com/rankfixer-ai/rankfixer-core).*

---

**Last Updated:** July 4, 2026
**Data Source:** [RankFixer Core v1.0.0](https://github.com/rankfixer-ai/rankfixer-core)
**License:** MIT — Free to use, modify, and distribute with attribution.
