# 🧠 RankFixer Core

> **An AI Website Visibility Checker.**
>
> RankFixer analyzes your website's schema markup, entity signals, and content structure to score how likely LLMs are to cite your content.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🎯 What Is RankFixer?

RankFixer is a free tool that scores your website's **Generative Engine Optimization (GEO)** — how visible your content is to AI models like ChatGPT, Perplexity, and Gemini.

**In plain English:** We crawl your site the way an AI crawler would, then score you on the signals that matter for AI citation.

---

## 🌐 Live Tool

**Try it free at [rankfixer.co/ai-visibility-checker](https://rankfixer.co/ai-visibility-checker)** — no signup, instant results.

The live tool scores on **6 dimensions**:

| Signal | Weight | What It Measures |
| :--- | :--- | :--- |
| **Schema Completeness** | 25% | JSON-LD `@type` markup (Organization, FAQPage, WebSite, Product, Article) |
| **Entity Signals** | 20% | `@id` references, `sameAs` links, brand markup, Open Graph tags |
| **Content Structure** | 20% | Word count, FAQ-like headings, lists/tables, meta description |
| **HTML Structure** | 15% | H1/H2 headings, microdata, semantic HTML5 elements |
| **Crawlability** | 10% | HTTP status, robots.txt accessibility |
| **llms.txt** | 10% | Presence of `/llms.txt` for AI crawler discovery |

**Scoring labels:**
- 80–100: Strong
- 60–79: Fair
- 40–59: Weak
- 0–39: Poor

---

## 🏗️ Architecture

The live scoring engine is a single **Netlify Function**:

```
site/netlify/functions/score.js
```

It has **zero dependencies** (uses Node.js global `fetch`) and **zero imports** from the rest of the codebase. It crawls the target domain directly, runs the scoring functions, and returns the result.

This is the only live code path. Everything else in this repo is either archived or not wired into production.

---

## 📦 What's in This Repo

| Path | Description |
|---|---|
| `site/netlify/functions/score.js` | **Live** — the scoring engine deployed to Netlify |
| `site/` | Static website (ai-visibility-checker UI, landing page) |
| `.archive/` | Archived code from earlier architectural experiments (not live) |
| `data/top_100_saas_scores.json` | Dataset: AI Visibility scores for 100 SaaS companies |
| `data/benchmark_report.md` | Report: analysis of the dataset |

---

## 🧪 Data & Research

We've open-sourced our research data:

- **📈 `/data/top_100_saas_scores.json`** — AI Visibility scores for 100 SaaS companies
- **📋 `/data/benchmark_report.md`** — Full analysis with industry breakdowns and quartile distributions

---

## 🤝 Contributing

This project is not actively seeking contributors. The live tool is maintained as a free resource.

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 📬 Contact

- **Website:** [rankfixer.co](https://rankfixer.co)
- **Twitter/X:** [@RankFixer](https://twitter.com/RankFixer)
- **Email:** hello@rankfixer.co

---

*Built with ❤️ in Bislig City, Philippines.*
