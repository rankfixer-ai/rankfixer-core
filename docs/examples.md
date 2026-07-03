# RankFixer Core — Use Cases & Examples

> Real-world scenarios and workflows for the RankFixer Core library.

---

## Use Case 1: Quick Health Check

**Scenario:** You want to know your site's AI visibility in 3 lines of code.

```python
from rankfixer_core import Analyzer

result = Analyzer().analyze("https://your-saas.com")
print(result.summary())
# Output: your-saas.com scores 34/100 (Tier 4: Poor). Top issue: AI crawlers blocked in robots.txt.
```

Real-world: A founder runs this against their landing page and discovers they've been invisible to AI for 2 years because GPTBot was blocked.

---

## Use Case 2: Competitive Benchmarking

**Scenario:** You want to see how you stack up against the top 3 players in your category.

```python
from rankfixer_core import Analyzer

domains = [
    "your-saas.com",
    "hubspot.com",       # Market leader
    "competitor-xyz.com", # Direct competitor
    "new-entrant.io"      # Up-and-comer
]

analyzer = Analyzer()
results = analyzer.batch_analyze(domains)

# Sort by score
ranked = sorted(results.items(), key=lambda x: x[1].score, reverse=True)
for rank, (domain, result) in enumerate(ranked, 1):
    print(f"#{rank} {domain}: {result.score}/100 — {result.tier_label}")
    print(f"   Top issue: {result.recommendations[0].title}")
    print()
```

**Sample Output:**
```
#1 hubspot.com: 89/100 — Excellent
   Top issue: Minor freshness signals on older blog posts

#2 competitor-xyz.com: 62/100 — Good
   Top issue: Missing FAQPage schema on product pages

#3 your-saas.com: 34/100 — Poor
   Top issue: AI crawlers blocked in robots.txt

#4 new-entrant.io: 18/100 — Critical
   Top issue: No schema.org markup detected at all
```

---

## Use Case 3: Head-to-Head Comparison

**Scenario:** Your biggest competitor just started showing up in ChatGPT answers. What do they have that you don't?

```python
from rankfixer_core import Analyzer

analyzer = Analyzer()
comparison = analyzer.compare("your-saas.com", "competitor.com")

print(f"Score gap: {comparison.score_gap} points")
print(f"Winner: {comparison.winner}")
print()

for gap in comparison.gaps:
    print(f"📉 {gap.signal}: {gap.description}")
    print(f"   Your score: {gap.score_a} / Competitor: {gap.score_b}")
    print(f"   Fix: {gap.recommendation}")
    print()
```

**Sample Output:**
```
Score gap: -28 points
Winner: competitor.com

📉 Schema Completeness: Competitor has Organization, WebSite, FAQPage, and Article schema on all pages
   Your score: 15/25 / Competitor: 24/25
   Fix: Add JSON-LD Organization and FAQPage schema to homepage and top 10 pages

📉 Entity Density: Competitor mentions brand 47 times per 1000 words with proper @id linking
   Your score: 8/20 / Competitor: 17/20
   Fix: Add @id-referenced brand mentions to H2 tags and body content
```

---

## Use Case 4: Continuous Monitoring

**Scenario:** Track your AI visibility over time and get alerted when it drops.

```python
from rankfixer_core import Analyzer
import json
from datetime import datetime
from pathlib import Path

HISTORY_FILE = Path("ai_visibility_history.json")

def track_score(url):
    analyzer = Analyzer()
    result = analyzer.analyze(url)
    
    # Load history
    history = []
    if HISTORY_FILE.exists():
        history = json.loads(HISTORY_FILE.read_text())
    
    # Get previous score
    prev_score = history[-1]["score"] if history else None
    
    # Append new result
    entry = {
        "timestamp": datetime.now().isoformat(),
        "score": result.score,
        "tier": result.tier_label,
        "top_issue": result.recommendations[0].title
    }
    history.append(entry)
    HISTORY_FILE.write_text(json.dumps(history, indent=2))
    
    # Alert on significant changes
    if prev_score is not None:
        delta = result.score - prev_score
        if delta >= 10:
            print(f"🚀 Score improved by {delta} points! Your fixes are working.")
        elif delta <= -10:
            print(f"⚠️ Score dropped by {abs(delta)} points. Check for issues.")
        else:
            print(f"Score: {result.score}/100 (change: {delta:+d})")
    
    return result

# Run weekly
track_score("https://your-saas.com")
```

---

## Use Case 5: Pre-Launch Audit

**Scenario:** You're launching a new product page. Check if it's AI-ready before go-live.

```python
from rankfixer_core import Analyzer

REQUIRED_SCORE = 60  # Minimum AI readiness for launch

analyzer = Analyzer(js_rendering=True)  # Enable JS rendering for SPA pages
result = analyzer.analyze("https://staging.your-saas.com/new-product")

print(f"Pre-launch audit: {result.score}/100")

if result.score >= REQUIRED_SCORE:
    print("✅ Ready for launch!")
else:
    print(f"❌ Below threshold ({REQUIRED_SCORE}). Fix these first:")
    for rec in result.recommendations[:3]:
        print(f"  - {rec.title} (impact: {rec.impact}/10, time: {rec.fix_time})")
```

---

## Use Case 6: Agency Client Reporting

**Scenario:** You're an SEO agency. Generate AI visibility reports for all your clients monthly.

```python
from rankfixer_core import Analyzer
import csv
from datetime import datetime

clients = [
    ("Client A", "https://client-a.com"),
    ("Client B", "https://client-b.com"),
    ("Client C", "https://client-c.com"),
]

analyzer = Analyzer()
report_date = datetime.now().strftime("%Y-%m-%d")

with open(f"ai_visibility_report_{report_date}.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["Client", "Score", "Tier", "Top Issue", "Fix Time"])
    
    for name, url in clients:
        result = analyzer.analyze(url)
        top = result.recommendations[0]
        writer.writerow([name, result.score, result.tier_label, top.title, top.fix_time])

print(f"Report saved: ai_visibility_report_{report_date}.csv")
```

---

## Use Case 7: Schema Audit

**Scenario:** Deep-dive into exactly what schema markup is present and what's missing.

```python
from rankfixer_core import Analyzer

analyzer = Analyzer()
result = analyzer.analyze("https://your-saas.com", export=True)

data = result.to_dict()
signals = data["signals"]["schema_completeness"]

print(f"Schema Score: {signals['score']}/{signals['max_score']}")
print(f"Status: {signals['status']}")
print()

if signals["details"]:
    print("Detected schema types:")
    for schema_type in signals["details"].get("detected", []):
        print(f"  ✅ {schema_type}")
    
    print()
    print("Missing (high-impact):")
    for schema_type in signals["details"].get("missing_critical", []):
        print(f"  ❌ {schema_type}")
```

---

## Use Case 8: AI Crawler Accessibility Check

**Scenario:** Verify that AI crawlers can actually access your site.

```python
from rankfixer_core import Analyzer

analyzer = Analyzer()
result = analyzer.analyze("https://your-saas.com", export=True)

crawler_status = result.to_dict()["signals"]["technical_signals"]["details"]["ai_crawlers"]

for crawler, allowed in crawler_status.items():
    status = "✅ Allowed" if allowed else "❌ Blocked"
    print(f"{crawler}: {status}")

if not all(crawler_status.values()):
    print("\n⚠️ At least one AI crawler is blocked. This is likely your #1 issue.")
    print("Fix: Update robots.txt to allow GPTBot, ClaudeBot, and PerplexityBot.")
```

---

## Integration Examples

### GitHub Actions CI Check

```yaml
# .github/workflows/ai-visibility-check.yml
name: AI Visibility Check
on: [deployment]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check AI Visibility
        run: |
          pip install rankfixer-core
          python -c "
          from rankfixer_core import Analyzer
          result = Analyzer().analyze('https://your-saas.com')
          print(f'Score: {result.score}/100')
          if result.score < 50:
              raise Exception(f'AI Visibility too low: {result.score}')
          "
```

### Slack Alert Integration

```python
import requests
from rankfixer_core import Analyzer

def alert_if_drop(url, webhook_url, threshold=-10):
    result = Analyzer().analyze(url)
    # Compare with stored previous score (simplified here)
    prev_score = load_previous_score(url)
    delta = result.score - prev_score
    
    if delta <= threshold:
        requests.post(webhook_url, json={
            "text": f"⚠️ {url} AI Visibility dropped {delta} points.\n"
                    f"Current: {result.score}/100\n"
                    f"Top issue: {result.recommendations[0].title}"
        })
```
