# RankFixer Research Brief

**Retrieval date:** 2026-08-19 (Asia/Taipei)
**Analyst:** RankFixer Live Data Analyst
**Research Status:** `PARTIAL — ORIGINAL MEASUREMENT + PUBLISHED EVIDENCE`
**Classification:** Evidence-backed research brief with limited original measurement —
not a completed RankFixer cross-engine study.

---

## Topic

Google vs ChatGPT vs Perplexity: Do They Cite the Same Websites?

## Primary Research Question

When the same query is posed to Google, ChatGPT, and Perplexity, how much do the
websites they cite overlap — and what does that mean for website visibility?

Sub-questions:

1. How much do ChatGPT's cited sources overlap with Google's top results?
2. How much do Perplexity's cited sources overlap with Google's top results?
3. How much do ChatGPT and Perplexity overlap with *each other*?
4. Which domains get cited most by each engine?
5. What can a website owner measure themselves — and turn into a free tool?

## Executive Finding *(Published Evidence)*

Google, ChatGPT, and Perplexity do **not** cite the same websites. Multiple independent
studies — Ahrefs, Frase, BrightEdge, SparkToro, and a 100,000-prompt field study — converge
on the same conclusion: reported citation overlap is low across the cited studies, with
reported values ranging ~6%–28% and not directly comparable across differing methodologies —
and even Google's own two AI products (AI Mode vs AI Overviews) cite the same
URLs only ~13.7% of the time. The critical nuance: Google's AI Overviews remain heavily
anchored to Google's own index (86% of citations come from the top 100), while third-party
engines (ChatGPT, Perplexity) draw from materially different corpora and overlap little with
Google — or with each other.

**Evidence layers used throughout this brief:**
1. **Published Evidence** — findings from external studies (Ahrefs, Frase, BrightEdge, SparkToro, Tow Center, etc.).
2. **RankFixer Direct Measurement** — data collected in this run (5 queries via AutoGLM/Perplexity-family backend).
3. **RankFixer Derived Analysis** — calculations performed from either dataset.
4. **Analyst Interpretation** — inferred conclusions.

A published finding is not RankFixer's own experiment; a direct measurement is not
generalized beyond its actual sample.

## Key Findings

1. **AI engines cite different sources — overlap with Google is low.**
   Only ~12% of URLs cited by the four AI assistants (ChatGPT, Gemini, Copilot, Perplexity)
   rank in Google's top 10 for the same query.
   *Source:* Ahrefs, "Only 12% of AI Cited URLs Rank in Google's Top 10" — Confidence: HIGH (primary study).

2. **ChatGPT overlaps least with Google.**
   ChatGPT's cited URLs show ~6.5%–8% overlap with Google's top results — the lowest of the
   engines measured.
   *Sources:* Frase ("Which AI Engines Cite Which Sources?", 2026 data, reports ChatGPT at 6–8%);
   AuthorityTech audit (6.5%). — Confidence: MEDIUM.

3. **Perplexity is the outlier — it overlaps more with Google than ChatGPT does.**
   Perplexity shows ~28.6% overlap with Google's top 10, versus ChatGPT's 6–8%.
   *Source:* Frase. — Confidence: MEDIUM.

4. **ChatGPT and Perplexity barely overlap with each other.**
   A 100,000-prompt field study found only ~11% of cited domains are shared between ChatGPT
   and Perplexity (i.e., ~89% of citations are unique to one platform).
   *Source:* Joshua Blyskal (LinkedIn, 100k prompts); corroborated by ZipTie.dev (11%) and
   QuickSEO (14% top-domain overlap). — Confidence: MEDIUM.

5. **Google's AI Overviews are the exception — they stay anchored to Google's index.**
   86% of AI Overview citations come from pages in Google's top 100; YouTube (21.1%),
   Reddit (18.5%), and Facebook (10.7%) are the most-cited domains.
   *Source:* Ahrefs (most-cited domains; 86% figure). — Confidence: HIGH.

6. **Even Google's two AI surfaces disagree with each other.**
   Google AI Mode and AI Overviews cited the same URLs only 13.7% of the time (Ahrefs,
   Dec 2025), while BrightEdge measured a higher ~59% top-100 overlap using a different
   method — both confirm the two surfaces are far from identical.
   *Sources:* Ahrefs via Search Engine Journal; BrightEdge. — Confidence: HIGH on the 13.7%
   figure; MEDIUM on BrightEdge's 59% (different metric: top-100 vs URL-level).

7. **Citation accuracy is a separate, serious problem.**
   The Tow Center for Digital Journalism (Columbia/CJR, March 2025) found 8 generative search
   tools produced inaccurate citations in >60% of news-query tests; a 2026 arXiv audit found
   ~16% of cited sources across 4 generative engines were AI-generated.
   *Sources:* CJR/Tow Center; arXiv "Synthetic Sources?" — Confidence: HIGH (accuracy finding).

## RankFixer Direct Measurement

Limited original data collected this run. **Single engine only** — AutoGLM search (a
Perplexity-family backend). No direct Google SERP or logged-in ChatGPT access.

Five queries were run on 2026-08-19; the returned source domains were:

| Query | Returned domains (AutoGLM / Perplexity-family) |
| --- | --- |
| "best project management software 2026" | project-management.com, reddit.com, paymoapp.com, wrike.com, zapier.com, youtube.com, thedigitalprojectmanager.com |
| "how to reduce website bounce rate" | smartbugmedia.com, cxl.com, mailchimp.com, blog.hubspot.com, youtube.com, webanalyticsassociation.com, forbes.com, wp-rocket.me |
| "best CRM software for small business" | zoho.com, slack.com, uschamber.com, youtube.com, forbes.com, pcmag.com, pipedrive.com |
| "best time to post on Instagram" | reddit.com, buffer.com, sproutsocial.com, manychat.com, blog.hootsuite.com, mailchimp.com, facebook.com, youtube.com |
| "how do AI search engines work" | ibm.com, zapier.com, gisma.com, youtube.com, ncbar.org, meilisearch.com, you.com, nightwatch.io |

Recurring domains: youtube.com (4/5 queries), reddit.com (2/5), forbes.com (2/5),
mailchimp.com (2/5), zapier.com (2/5).

**Scope note:** this demonstrates *one* engine's source selection and is **not** a
cross-engine comparison. The cross-engine conclusions in this brief rest on Published
Evidence, not on this measurement.

**Access check (2026-08-19, second-engine attempt):**
- Google SERP via browser automation — **blocked**: the `autoglm` browser-service binary is
  not installed on this host (no `autoglm.exe`, no `config.json`, no session pool).
- Google SERP via direct HTTP — **blocked**: the request returned an empty/blocked response
  (no organic result links).
- ChatGPT — **not accessible**: requires login; no credentials available.
- Net: RankFixer direct measurement remains single-engine (Perplexity-family). Upgrading to a
  true multi-engine original experiment requires browser-automation setup or ChatGPT access.

## Important Statistics

| Metric | Value | Engine pair | Source | Confidence |
| --- | ---: | --- | --- | --- |
| AI-cited URLs (4 assistants) in Google top 10 | 12% | ChatGPT/Gemini/Copilot/Perplexity vs Google | Ahrefs | HIGH |
| Average citation overlap between AI engines | 10% | across engines | Ahrefs | MEDIUM |
| ChatGPT URL overlap with Google top results | 6–8% (6.5%) | ChatGPT vs Google | Frase / AuthorityTech | MEDIUM |
| Perplexity overlap with Google top 10 | 28.6% | Perplexity vs Google | Frase | MEDIUM |
| Shared domain citations | 11% | ChatGPT vs Perplexity | Blyskal (100k prompts) | MEDIUM |
| AI Mode vs AI Overviews URL overlap | 13.7% | Google vs Google | Ahrefs (Dec 2025) | HIGH |
| AI Mode vs AI Overviews top-100 overlap | ~59% | Google vs Google | BrightEdge | MEDIUM |
| AI Overview citations from Google top 100 | 86% | AI Overviews | Ahrefs | HIGH |
| AI Overview citations from top 10 | 76% → 38% (declining) | AI Overviews | Ahrefs | HIGH |
| Most-cited AI Overview domains | YouTube 21.1% / Reddit 18.5% / Facebook 10.7% | AI Overviews | Ahrefs | HIGH |
| Inaccurate citations in news queries | >60% | 8 AI search tools | Tow Center/CJR (Mar 2025) | HIGH |
| AI-generated sources among citations | ~16% | 4 generative engines | arXiv | MEDIUM |

## Trend Analysis

### Observed
- Reported citation overlap between Google and third-party AI engines is low across the
  cited studies (values ~6%–28%; not directly comparable across methodologies).
- ChatGPT↔Perplexity overlap is ~11%.
- Google AI Overviews cite from Google's own top-100 index 86% of the time.
- AI Overviews' reliance on the top 10 has *declined* (Ahrefs: 76% → 38%).

### Derived (RankFixer-calculated)
- ChatGPT↔Perplexity non-overlap = 100% − 11% = **89%** of citations are unique to one engine.
- Perplexity's Google overlap (28.6%) is roughly **3.5–4.8×** ChatGPT's (6–8%).
- ~12% of URLs cited by the four AI assistants studied by Ahrefs also appeared in Google's
  top 10 for the corresponding queries. (This is **not** equivalent to "a top-10 page has a
  12% chance of being cited by AI" — the denominator is AI-cited URLs, not Google rankings.)

### Interpreted
- Google's AI is a Google-index product; ChatGPT and Perplexity are separate retrieval
  systems (ChatGPT leans on Bing + training data; Perplexity on its own index + sources).
  Low overlap is structural, not random.
- Declining AI-Overview→top-10 alignment suggests Google is broadening citations beyond
  classic SEO winners (notably to YouTube and Reddit).
- **Causation not established** between ranking in Google and being cited by AI engines —
  the data shows only correlation/overlap, and the overlap is weak and declining.

## Important Changes

- Ahrefs updated its AI Overviews study: top-10 citation share fell from **76% → 38%**
  (published as "Update: 38% of AI Overview Citations Pull From The Top 10").
- YouTube overtook Reddit as the single most-cited domain in Google AI Overviews (grew 34%
  over six months).
- Google AI Mode and AI Overviews were shown to cite different URLs (13.7% overlap), meaning
  "rank on Google" no longer guarantees "cited in Google's AI."

## Contradictory Evidence

- **Google-anchored vs low-overlap:** Ahrefs reports only 12% of AI-cited URLs rank in
  Google's top 10 (low), yet also reports 86% of AI *Overviews* citations come from Google's
  top 100 (high). *Resolution:* the 12% figure measures third-party assistants (ChatGPT,
  Gemini, Copilot, Perplexity), while the 86% figure measures Google's own AI Overviews.
  Different populations — both can be true.
- **13.7% vs ~59% for Google AI Mode ↔ AI Overviews:** Ahrefs (URL-level, Dec 2025) vs
  BrightEdge (top-100 domain overlap). *Resolution:* different overlap definitions
  (exact URL vs top-100 membership). Direction agrees (they differ), magnitude differs.
- **AI Overviews↔organic overlap:** discoveredlabs reports 54% of AI Overview citations
  overlap the top-20 (and 97% cite at least one top-20 page), which reads higher than
  Ahrefs' 38% top-10 figure. *Resolution:* top-20 vs top-10 scope, and different sample
  periods.

## Data Limitations

- **My direct measurement was single-engine.** This session I ran 5 real queries through my
  search tool (AutoGLM, a Perplexity-family backend). I could not directly query Google SERP
  or logged-in ChatGPT (no credentials / no clean public API). The cross-engine comparison
  therefore relies on the published multi-engine studies (Ahrefs, Frase, BrightEdge, 100k-prompt
  study), which I validated for internal consistency but did not reproduce end-to-end.
- **Publication dates are partially approximate.** Several study pages did not expose exact
  publish dates in search snippets; where a date was reported (e.g., Tow Center Mar 2025,
  Ahrefs Dec 2025) I recorded it, otherwise the study's label (e.g., "2026 data") is used.
- **Metrics are not directly comparable across studies** (URL-level vs domain-level vs top-10
  vs top-100 vs top-20 overlap).
- **Sample sizes vary** and are not always disclosed (e.g., Frase, BrightEdge sample sizes
  were not visible in snippets).
- **AI engine behavior is non-deterministic** and changes frequently; all figures are
  point-in-time snapshots and will drift.

## Safe Claims

- Google, ChatGPT, and Perplexity cite materially different websites; reported overlap is
  low across independent studies (values ~6%–28%, not directly comparable across methods). (HIGH)
- Google's AI Overviews cite primarily from Google's own index (86% from top 100). (HIGH)
- ChatGPT overlaps least with Google (6–8%); Perplexity overlaps more (~28.6%). (MEDIUM)
- ChatGPT and Perplexity share only ~11% of cited domains. (MEDIUM)
- YouTube and Reddit are dominant AI-Overview citation sources. (HIGH)
- AI Overviews' reliance on the top-10 has declined over time (76% → 38%). (HIGH)

## Claims Requiring Qualification

- Exact overlap percentages are methodology-dependent (URL vs domain vs position threshold)
  and should be cited with their specific definition. (MEDIUM)
- "Ranking in Google's top 10 → being cited by AI" is a correlation, not a causal or even a
  strong relationship. State as overlap, not effect.

## Unsupported Claims

- That any single factor (e.g., schema markup, word count) *causes* AI citation. No causal
  evidence was found in this research. `Causation not established.`
- That ChatGPT/Perplexity citation behavior is stable over time — it is not; treat all
  figures as time-bound.
- Any claim that a website ranking well on Google is automatically visible to AI search.

---

# Free Tool Opportunity

## Candidate 1 — AI Visibility Gap Checker (URL + query)

Problem: Site owners can't tell whether ChatGPT, Perplexity, and Google are citing their site
for a target query — or whether competitors are being cited instead.

Evidence: The entire brief above — overlap is low (6–28%), and no single ranking position
predicts AI citation. Users need to *measure the gap*, not just the overlap.

Inputs: One URL + one search query (or a small keyword list).

Data required: Perplexity API (clean, affordable, returns cited URLs); Google SERP data via a
SERP API or user-pasted results; ChatGPT via browser/manual (limited).

Output: Google ranking, AI-citation detection (cited URL / cited domain), competitors cited,
and two directional gaps — Ranking→AI Citation Gap and AI Citation→Google Ranking Gap — with
evidence/source links.

Technical feasibility: 7/10 (Perplexity API is easy; Google/ChatGPT are the hard part).

User value: 9/10. Score: **82/100**.

## Candidate 2 — "Who Cites My Domain?" AI Mention Checker

Problem: A site owner wants a simple yes/no + count: does my domain appear in AI answers?

Evidence: Ahrefs/Frase show citation is engine-specific; users need a per-domain check.

Inputs: One domain/URL.

Data required: Perplexity API (query the domain's brand/name and scan returned sources);
optionally ChatGPT/Google.

Output: "Detected in Perplexity: yes (N mentions)" + top queries that surfaced the domain.

Technical feasibility: 8/10 (single API). User value: 9/10. Score: **83/100**.

## Candidate 3 — Google SERP vs AI Visibility Comparison

Problem: Users want to compare their traditional ranking against their AI visibility directly.

Evidence: Ahrefs' 12% top-10 overlap is the exact metric; users want it per-query.

Inputs: Query + domain.

Data required: Google SERP API (paid) + Perplexity API.

Output: "Google top-10: yes/no" vs "AI cited: yes/no" + overlap score.

Technical feasibility: 5/10 (needs paid SERP API). User value: 8/10. Score: **70/100**.

---

# Recommended Free Tool

## Name

**RankFixer AI Visibility Gap Checker**

## Why This Tool

It converts the article's research question into something a website owner can test directly.
The evidence shows citation is low-overlap and engine-specific, so the useful output is not a
generic overlap % but a **directional gap**: am I ranking but not cited (Ranking→Citation gap),
or cited but not ranking (Citation→Ranking gap)? Perplexity's API makes a first version
technically realistic today; ChatGPT, Gemini, Claude, and AI Overviews can be added later.

## MVP

Enter URL + query → run the query through Perplexity (API) → extract cited domains/URLs →
compare against the user's Google ranking (SERP API or manual paste) → return two gap flags
(Ranking→Citation, Citation→Ranking) plus competitors cited and evidence links.

## Required Data

Perplexity API (primary); Google SERP API or manual paste; optional ChatGPT
(manual/browser capture, added in a later stage).

## User Flow

1. User enters their URL + a target query (e.g., "best CRM for small business").
2. System checks the Google ranking for the query and runs it through Perplexity, extracting
   cited URLs/domains.
3. System matches the user's domain against AI citations and records cited competitors.
4. System computes two directional gaps (Ranking→Citation and Citation→Ranking).
5. User receives a report: ranking, citation detection, competitors cited, gap flags, and
   evidence/source links.

## Example Output (hypothetical — labeled example)

```text
Query:  "best CRM for small business"
Domain: example.com

Google ranking:        #4
AI citation detected: No
Cited URL:            —
Cited domain:         example.com absent; zoho.com, forbes.com, pcmag.com cited
Competitors cited:    zoho.com, forbes.com, pcmag.com, uschamber.com

Ranking → AI Citation Gap:   HIGH   (ranking #4 but not cited by Perplexity)
AI Citation → Ranking Gap:   n/a    (not cited, so no citation-side gap)

Evidence links:
- Perplexity result: https://www.perplexity.ai/search?q=...
- Google SERP snapshot: [screenshot]
```

## Free Usage Limit

3 queries/day (Perplexity API cost is the binding constraint). Logged-in optional.

## Natural RankFixer Connection

The free tool answers "am I cited, and where is the gap?" RankFixer's deeper product extends
this into a measurement system: continuous monitoring, historical tracking, and multi-engine
coverage (Perplexity → ChatGPT → Gemini → Claude → AI Overviews) — a natural upgrade, not a
sales pitch.

---

# Recommended Visualizations

1. **Grouped bar chart** — citation overlap % per engine pair (ChatGPT↔Google 6–8%,
   Perplexity↔Google 28.6%, ChatGPT↔Perplexity 11%, AI Mode↔Overviews 13.7%).
   Data: Frase, Ahrefs, Blyskal. Insight: overlap is universally low; Perplexity is the
   Google-adjacent outlier.
2. **Venn diagram** — ChatGPT vs Perplexity vs Google citation sets (illustrating ~11% and
   6–28% overlaps). Insight: three nearly-disjoint source universes.
3. **Line chart** — Ahrefs AI Overviews top-10 citation share over time (76% → 38%).
   Data: Ahrefs. Insight: Google's AI is decoupling from classic top-10 rankings.
4. **Horizontal bar** — most-cited AI Overview domains (YouTube 21.1%, Reddit 18.5%,
   Facebook 10.7%). Data: Ahrefs. Insight: social/UGC platforms dominate AI citations.

---

# Sources

| Source | URL | Pub date | Data period | Type | Relevance |
| --- | --- | --- | --- | --- | --- |
| Ahrefs — Only 12% of AI Cited URLs Rank in Google's Top 10 | https://ahrefs.com/blog/ai-search-overlap/ | 2025–2026 (n/a exact) | 2025–2026 | Tier 1 industry research | Core overlap study (ChatGPT/Gemini/Copilot/Perplexity vs Google) |
| Ahrefs — Most-Cited Websites in Google AI Overviews | https://ahrefs.com/blog/most-cited-domains-ai-overviews/ | 2025 (July data) | July snapshot | Tier 1 | Top AI-Overview cited domains |
| Ahrefs — 38% of AI Overview Citations Pull From The Top 10 | https://ahrefs.com/blog/ai-overview-citations-top-10/ | 2025–2026 | 6-month change | Tier 1 | Declining top-10 reliance |
| Frase — Which AI Engines Cite Which Sources? (2026 Data) | https://www.frase.io/blog/which-ai-engines-cite-which-sources | 2026 | 2026 | Tier 2 | Perplexity 28.6% vs ChatGPT 6–8% |
| BrightEdge — Why AI Engines Cite Different Sources | https://www.brightedge.com/resources/weekly-ai-search-insights/ai-search-same-brands-different-sources | 2026 | 2026 | Tier 2 | 5-engine source overlap (AI Mode↔Overviews ~59%) |
| Search Engine Journal — Google AI Mode & AI Overviews Cite Different URLs | https://www.searchenginejournal.com/google-ai-mode-ai-overviews-cite-different-urls-per-ahrefs-report/563364/ | 2025 | 2025 | Tier 2 | 13.7% URL overlap (Ahrefs) |
| Joshua Blyskal (LinkedIn) — 100k prompts ChatGPT vs Perplexity | https://www.linkedin.com/posts/joshua-blyskal_i-analyzed-100k-prompts-across-chatgpt-and-activity-7345819232120565760-NVx6 | 2026 | 2026 | Tier 2/3 | 11% domain overlap |
| SparkToro — AIs Are Highly Inconsistent When Recommending Brands | https://sparktoro.com/blog/new-research-ais-are-highly-inconsistent-when-recommending-brands-or-products-marketers-should-take-care-when-tracking-ai-visibility/ | 2025 | 2025 (2,961 prompts, 600 volunteers) | Tier 2 | Cross-engine inconsistency |
| Tow Center / CJR — AI Search Has a Citation Problem | https://www.cjr.org/tow_center/we-compared-eight-ai-search-engines-theyre-all-bad-at-citing-news.php | 2025-03 | 2025 | Tier 1 | >60% inaccurate citations |
| arXiv — Synthetic Sources? Auditing Generative Search Engines | https://arxiv.org/html/2605.23684v1 | 2026 | 2026 | Tier 1 academic | ~16% AI-generated cited sources |
| ZipTie.dev — How Different AI Platforms Cite the Same Source Differently | https://ziptie.dev/blog/how-different-ai-platforms-cite-the-same-source-differently/ | 2026 | 2026 | Tier 3 | Corroborates 11% / 71% single-platform |
| QuickSEO — What Gets Cited by ChatGPT, Claude, Gemini, Perplexity | https://quickseo.ai/blog/ai-citation-patterns-chatgpt-claude-gemini-perplexity | 2026 | 2026 | Tier 3 | 14% top-domain overlap |

---

# FINAL QUALITY GATE

- [x] Every important statistic has a source.
- [x] Every source is traceable (URL listed).
- [x] Current vs historical data distinguished (Ahrefs 76%→38% trend labeled).
- [x] Derived calculations labeled as derived (89% non-overlap, 3.5–4.8× ratio).
- [x] Evidence layers separated (Published / Direct Measurement / Derived / Interpretation).
- [x] Correlation not presented as causation (explicitly flagged).
- [x] Conflicting evidence documented (Google-anchored vs low-overlap; 13.7% vs 59%).
- [x] Unsupported claims identified.
- [x] Confidence levels assigned.
- [x] Data limitations documented (single-engine direct measurement, date uncertainty).
- [x] ≥1 free-tool opportunity evaluated (3 candidates scored).
- [x] Recommended tool technically realistic (Perplexity API MVP).
- [x] Free tool provides genuine user value.
- [x] Tool recommendation evidence-based, not marketing.
- [x] No fabricated data, sources, statistics, or conclusions.
