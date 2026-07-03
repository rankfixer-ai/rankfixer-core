# RankFixer Campaign Launch — Execution Punchlist

> **Campaign:** "AI Readiness of 100 SaaS Companies"
> **Launch Window:** July 4-6, 2026
> **Status:** ASSETS PREPPED — awaiting manual distribution

---

## HERMES-DELIVERED (these are done)

| # | Asset | Path | Status |
|---|-------|------|--------|
| 1 | Blog post with full frontmatter + OG tags | `blog/ai-readiness-100-saas.md` | ✅ Pushed |
| 2 | Social launch kit (LI, X, Reddit, HN, email) | `blog/social-launch-kit.md` | ✅ Pushed |
| 3 | JSON-LD Schema injection | Below in this PR | ✅ Ready |
| 4 | Free Checker UI update spec | `blog/checker-ui-update-spec.md` | ✅ Pushed |
| 5 | Image/chart specs for designer | `blog/chart-specs.md` | ✅ Pushed |
| 6 | Email templates (user list + PQL + follow-up) | `blog/email-templates-campaign.md` | ✅ Pushed |
| 7 | Campaign tracker spreadsheet template | `blog/campaign-tracker.csv` | ✅ Pushed |
| 8 | GitHub README badge update | Below | ✅ Ready |

---

## YOU-DELIVERED (manual actions — copy from our kits)

### PHASE 1: Website (5 min after deploy)

| # | Action | Copy From | Status |
|---|--------|-----------|--------|
| 1 | Deploy blog post to rankfixer.co/blog | `blog/ai-readiness-100-saas.md` | [ ] |
| 2 | Add JSON-LD to blog `<head>` | `blog/json-ld-injection.html` | [ ] |
| 3 | Add "Blog" link to checker header | `blog/checker-ui-update-spec.md` §1 | [ ] |
| 4 | Add post-results banner to checker | `blog/checker-ui-update-spec.md` §2 | [ ] |
| 5 | Add "Star on GitHub" badge to site | `blog/checker-ui-update-spec.md` §3 | [ ] |

### PHASE 2: LinkedIn (10 min)

| # | Action | Copy From | Status |
|---|--------|-----------|--------|
| 6 | Post long-form article | `blog/social-launch-kit.md` §LinkedIn Post | [ ] |
| 7 | Post carousel (10 slides) | `blog/social-launch-kit.md` + chart specs | [ ] |
| 8 | Tag influencers in comments | (your network) | [ ] |

### PHASE 3: Twitter/X (5 min)

| # | Action | Copy From | Status |
|---|--------|-----------|--------|
| 9 | Post 10-tweet thread | `blog/social-launch-kit.md` §Twitter/X Thread | [ ] |
| 10 | Pin thread to profile | (navigate to tweet → pin) | [ ] |

### PHASE 4: Reddit (10 min)

| # | Action | Copy From | Status |
|---|--------|-----------|--------|
| 11 | Post to r/SaaS | `blog/social-launch-kit.md` §Reddit Post | [ ] |
| 12 | Post to r/SEO | Same, frame as GEO discussion | [ ] |
| 13 | Post to r/LocalLLaMA | Same, frame as open-source | [ ] |

### PHASE 5: Hacker News (2 min)

| # | Action | Copy From | Status |
|---|--------|-----------|--------|
| 14 | Post Show HN | `blog/social-launch-kit.md` §Hacker News | [ ] |

### PHASE 6: Email (5 min)

| # | Action | Copy From | Status |
|---|--------|-----------|--------|
| 15 | Send to all free users | `blog/email-templates-campaign.md` §Email 1 | [ ] |
| 16 | Queue PQL follow-up (Day 3) | `blog/email-templates-campaign.md` §Email 2 | [ ] |
| 17 | Queue follow-up (Day 7) | `blog/email-templates-campaign.md` §Email 3 | [ ] |

### PHASE 7: Monitor (ongoing)

| # | Action | Status |
|---|--------|--------|
| 18 | Track GitHub stars | [ ] |
| 19 | Respond to comments (LI, X, Reddit, HN) | [ ] |
| 20 | Track metrics in `blog/campaign-tracker.csv` | [ ] |

---

## JSON-LD Schema Injection

Copy this into the blog post's `<head>`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ScholarlyArticle",
  "headline": "We Analyzed the AI Readiness of 100 Top SaaS Websites (Data + Open Source Code)",
  "description": "We ran the top 100 B2B SaaS websites through RankFixer's AI Visibility engine. 67% scored below 40/100. Here's the full dataset, methodology, and open-source code.",
  "author": {
    "@type": "Organization",
    "name": "RankFixer",
    "url": "https://rankfixer.co"
  },
  "datePublished": "2026-07-04",
  "dateModified": "2026-07-04",
  "publisher": {
    "@type": "Organization",
    "name": "RankFixer",
    "url": "https://rankfixer.co",
    "sameAs": [
      "https://github.com/rankfixer-ai",
      "https://twitter.com/RankFixer"
    ]
  },
  "about": {
    "@type": "Thing",
    "name": "Generative Engine Optimization",
    "description": "The practice of optimizing websites for citation by Large Language Models including ChatGPT, Perplexity, Claude, and Gemini."
  },
  "citation": [
    {
      "@type": "CreativeWork",
      "name": "RankFixer Core",
      "url": "https://github.com/rankfixer-ai/rankfixer-core"
    },
    {
      "@type": "Dataset",
      "name": "Top 100 SaaS LLM Readiness Scores",
      "url": "https://github.com/rankfixer-ai/rankfixer-core/blob/main/data/top_100_saas_scores.json"
    }
  ],
  "keywords": [
    "GEO", "AI Visibility", "SaaS", "LLM", "Open Source",
    "Schema.org", "Entity Density", "ChatGPT", "Perplexity",
    "Generative Engine Optimization", "AI Search"
  ],
  "inLanguage": "en",
  "isAccessibleForFree": true,
  "license": "https://opensource.org/licenses/MIT"
}
</script>
```

## Open Graph Meta Tags

Add to blog post `<head>`:

```html
<meta property="og:title" content="We Analyzed the AI Readiness of 100 Top SaaS Websites (Data + Open Source Code)">
<meta property="og:description" content="We ran the top 100 B2B SaaS websites through RankFixer's AI Visibility engine. 67% scored below 40/100. Full dataset open-sourced.">
<meta property="og:image" content="https://rankfixer.co/images/blog/saas-ai-readiness-2026.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="https://rankfixer.co/blog/ai-readiness-100-saas">
<meta property="og:type" content="article">
<meta property="og:site_name" content="RankFixer">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="We Analyzed the AI Readiness of 100 Top SaaS Websites (Data + Open Source Code)">
<meta name="twitter:description" content="67% of top SaaS sites score below 40/100 on AI visibility. We analyzed 100 domains and open-sourced everything.">
<meta name="twitter:image" content="https://rankfixer.co/images/blog/saas-ai-readiness-2026.png">
```

---

## How to Use This Punchlist

1. Open `blog/social-launch-kit.md` in one tab
2. Open this file in another tab
3. Work through each item — every copy block is pre-written in the kit
4. Check boxes as you go
5. Track metrics in `blog/campaign-tracker.csv`

**Estimated time: 45-60 minutes total** if you're copy-pasting from our prepared assets.
