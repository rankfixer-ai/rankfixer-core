# RankFixer Core Architecture

> Deep dive into the 3-step pipeline: Extraction → LLM-Readiness Scoring → Recommendation Engine.

---

## System Overview

```
┌──────────────┐     ┌──────────────────┐     ┌────────────────────┐
│   TARGET     │     │    EXTRACTION    │     │   LLM-READINESS    │
│   WEBSITE    │────▶│    PIPELINE      │────▶│   SCORING ENGINE   │
│   (URL)      │     │                  │     │                    │
└──────────────┘     └──────────────────┘     └─────────┬──────────┘
                       │                                │
                       │ HTML, JSON-LD,                  │ Score (0-100)
                       │ Microdata, RDFa,               │ Signal breakdowns
                       │ Core Web Vitals                │ Entity analysis
                       │                                │
                       ▼                                ▼
              ┌──────────────────┐     ┌────────────────────────┐
              │   NORMALIZED     │     │   RECOMMENDATION       │
              │   DATA MODEL     │────▶│   ENGINE               │
              │                  │     │                        │
              └──────────────────┘     │ Prioritized fixes      │
                                       │ Time estimates         │
                                       │ Expected impact        │
                                       └────────────────────────┘
```

---

## Step 1: Extraction Pipeline

### 1.1 URL Resolution & Fetching

```python
class URLExtractor:
    """
    Resolves and fetches target URL with AI crawler simulation.
    
    - Follows redirects (max 5 hops)
    - Respects robots.txt (but logs blocks for AI crawlers specifically)
    - Sets User-Agent to emulate GPTBot/ClaudeBot for accurate rendering
    - Falls back to headless browser for JS-heavy sites
    """
```

**Key behaviors:**
- Timeout: 30 seconds for fetch, 60 seconds for JS-rendered fallback
- Max page size: 10MB (pages larger than this are truncated with a warning)
- Respects `X-Robots-Tag: noindex` and `<meta name="robots" content="noindex">`
- Detects and warns on JavaScript-only rendering (empty `<body>` after fetch)

### 1.2 Schema.org Extraction

```python
class SchemaExtractor:
    """
    Extracts all schema.org markup from a page.
    
    Supported formats:
    - JSON-LD (primary — most LLM-friendly)
    - Microdata (extracted but scored lower)
    - RDFa (extracted but scored lower)
    
    Supported types:
    - Organization, WebSite, WebPage, Article
    - FAQPage, QAPage, HowTo
    - Product, Review, AggregateRating
    - BreadcrumbList, SiteNavigationElement
    - Person, Event, JobPosting
    """
```

**Scoring implications:**
- JSON-LD is preferred over Microdata (LLMs parse it more reliably)
- Nested entities with `@id` references score higher than flat definitions
- `sameAs` links to authoritative sources (Wikipedia, Crunchbase, LinkedIn) boost entity recognition
- Missing `@type` declarations are flagged as errors

### 1.3 Content Structure Analysis

```python
class ContentAnalyzer:
    """
    Analyzes semantic HTML structure and content quality.
    
    Metrics:
    - Heading hierarchy (H1-H6) completeness and nesting
    - Answer density: ratio of declarative sentences to total text
    - Entity mentions per 1000 words
    - Readability (Flesch-Kincaid, target Grade 8-10)
    - Content-to-HTML ratio
    - Internal link structure and anchor text diversity
    """
```

### 1.4 Technical Signal Extraction

```python
class TechnicalAnalyzer:
    """
    Measures technical SEO and performance signals.
    
    Signals:
    - Core Web Vitals: LCP, INP, CLS (via Lighthouse API)
    - HTTPS enforcement (redirect, HSTS header)
    - Mobile responsiveness (viewport meta, responsive CSS)
    - robots.txt directives for AI crawlers
    - Sitemap.xml presence and lastmod dates
    - Canonical URL consistency
    - Page load time (Time to First Byte, DOMContentLoaded)
    """
```

---

## Step 2: LLM-Readiness Scoring Engine

### 2.1 Signal Weights & Calculation

| Signal | Weight | Measurement Method |
|--------|--------|-------------------|
| Schema Completeness | 25% | Count and quality of schema.org types present |
| Entity Density | 20% | Named entities per 1000 words + @id linkage |
| Content Answer Density | 20% | Declarative sentences / total sentences |
| Technical Signals | 15% | Core Web Vitals pass/fail + security + crawlability |
| Backlink Quality | 10% | Moz DA / Ahrefs DR + .edu/.gov ratio |
| Brand Entity Recognition | 5% | Organization schema + sameAs links present |
| Freshness | 5% | dateModified in schema or HTTP Last-Modified |

### 2.2 Scoring Formula

```
raw_score = Σ (signal_score × weight) for all 7 signals
final_score = clamp(raw_score, 0, 100)
tier = categorize(final_score)
```

### 2.3 Tier System

| Score Range | Tier | Label | % of Domains (from our 10K study) |
|-------------|------|-------|-----------------------------------|
| 0-20 | Tier 5 | Critical — Invisible to AI | 78% |
| 21-40 | Tier 4 | Poor — Occasional mentions | 7% |
| 41-60 | Tier 3 | Fair — Present but not prominent | 3% |
| 61-80 | Tier 2 | Good — Consistently cited | 1.5% |
| 81-100 | Tier 1 | Excellent — AI-first brand | 0.5% |

---

## Step 3: Recommendation Engine

### 3.1 Prioritization Algorithm

```python
def prioritize_recommendations(issues, current_score):
    """
    Ranks issues by: (impact × speed) / difficulty
    
    Priority factors:
    - Higher impact on score gets higher priority
    - Faster fixes are preferred for low-scoring domains (momentum)
    - Longer-term fixes are surfaced for high-scoring domains
    - No more than 5 recommendations returned (avoid overwhelm)
    - #1 recommendation is always the "Quick Win"
    """
```

### 3.2 Recommendation Categories

| Category | Example | Typical Impact | Typical Fix Time |
|----------|---------|---------------|-----------------|
| Critical | AI crawlers blocked in robots.txt | +10-15 pts | 5 minutes |
| High | Missing Organization/WebSite schema | +8-12 pts | 1-2 hours |
| Medium | Low entity density | +5-10 pts | 2-4 hours |
| Enhancement | Add FAQPage schema | +5-8 pts | 1-3 hours |
| Strategic | Build knowledge base presence | +15-25 pts | 2-8 weeks |

### 3.3 Output Format

```json
{
  "score": 34,
  "tier": 4,
  "tier_label": "Poor",
  "signals": {
    "schema_completeness": {"score": 15, "max": 25, "issues": ["Missing Organization schema"]},
    "entity_density": {"score": 8, "max": 20, "issues": ["Only 2 entity mentions per 1000 words"]},
    "content_answer_density": {"score": 12, "max": 20},
    "technical_signals": {"score": 9, "max": 15, "issues": ["LCP > 4s"]},
    "backlink_quality": {"score": 4, "max": 10},
    "brand_entity_recognition": {"score": 1, "max": 5, "issues": ["No sameAs links"]},
    "freshness": {"score": 3, "max": 5}
  },
  "recommendations": [
    {
      "priority": 1,
      "title": "Implement Organization and WebSite Schema",
      "category": "Critical",
      "impact": 12,
      "fix_time": "1-2 hours",
      "is_quick_win": true,
      "steps": ["Add JSON-LD Organization schema to homepage", "Include sameAs links to social profiles"]
    }
  ],
  "competitors_mentioned": ["hubspot.com", "salesforce.com"],
  "platforms_analyzed": ["chatgpt", "perplexity", "google_aio"]
}
```

---

## Caching & Performance

- **TTL:** Analysis results cached for 24 hours per URL
- **Rate Limiting:** Max 60 requests/minute for batch analysis
- **Parallel Processing:** Up to 5 URLs analyzed simultaneously in batch mode
- **Fallback:** If Lighthouse API is unavailable, Core Web Vitals are estimated from page metrics

---

## Privacy & Data Handling

- Scan results are ephemeral by default (not stored server-side)
- Users opt in to persistent tracking via email capture
- No PII is extracted from analyzed domains
- robots.txt directives are respected for all crawler simulation
- Analysis does not store page content — only extracted signals and scores
