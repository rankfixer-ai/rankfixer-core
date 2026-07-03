# RankFixer Core — API Reference

> Complete API surface for the RankFixer Core Python library. All public classes, methods, and return types.

---

## Installation

```bash
pip install rankfixer-core
```

---

## Core Classes

### `Analyzer`

The main entry point. Analyzes websites for LLM readiness.

```python
from rankfixer_core import Analyzer

analyzer = Analyzer(
    timeout=30,              # HTTP request timeout in seconds
    js_rendering=False,      # Enable headless browser for JS-heavy sites
    respect_robots=True,     # Respect robots.txt directives
    user_agent="RankFixer/1.0",  # Custom User-Agent string
    cache_ttl=86400          # Cache analysis results for 24 hours (seconds)
)
```

#### Methods

##### `analyze(url: str, export: bool = False) -> AnalysisResult`

Analyze a single URL for LLM readiness.

**Parameters:**
- `url` (str): The target URL to analyze. Must include protocol (http:// or https://).
- `export` (bool): If True, include full extracted data in the result. Default: False.

**Returns:** `AnalysisResult` object.

**Raises:**
- `ValueError`: If URL is invalid or unreachable.
- `TimeoutError`: If the request exceeds `timeout`.
- `AnalysisError`: If analysis fails for an unexpected reason.

**Example:**
```python
result = analyzer.analyze("https://example.com")
print(result.score)           # 56
print(result.tier)            # 3
print(result.recommendations) # List of Recommendation objects
```

##### `batch_analyze(urls: List[str], max_concurrent: int = 5) -> Dict[str, AnalysisResult]`

Analyze multiple URLs in parallel.

**Parameters:**
- `urls` (List[str]): List of URLs to analyze.
- `max_concurrent` (int): Maximum concurrent analysis workers. Default: 5.

**Returns:** `Dict[str, AnalysisResult]` mapping URL to result.

**Example:**
```python
urls = ["hubspot.com", "stripe.com", "shopify.com"]
results = analyzer.batch_analyze(urls)

for domain, result in results.items():
    print(f"{domain}: {result.score}/100 ({result.tier_label})")
```

##### `compare(url_a: str, url_b: str) -> ComparisonResult`

Compare two URLs side-by-side, identifying gaps.

**Parameters:**
- `url_a` (str): First URL (typically your domain).
- `url_b` (str): Second URL (typically a competitor).

**Returns:** `ComparisonResult` object with gap analysis.

---

### `AnalysisResult`

Returned by `analyze()` and `batch_analyze()`.

#### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `score` | `int` | Overall AI Visibility Score (0-100) |
| `tier` | `int` | Tier number (1-5, lower is better) |
| `tier_label` | `str` | Human-readable tier label ("Critical", "Poor", etc.) |
| `signals` | `Dict[str, SignalResult]` | Breakdown by signal |
| `recommendations` | `List[Recommendation]` | Prioritized fixes |
| `platforms` | `PlatformResults` | Per-platform visibility status |
| `competitors` | `List[str]` | Competitors detected in AI results |
| `url` | `str` | The analyzed URL |
| `analyzed_at` | `datetime` | Timestamp of analysis |

#### Methods

##### `to_dict() -> dict`

Serialize the result to a JSON-compatible dictionary.

```python
import json
result = analyzer.analyze("example.com")
with open("report.json", "w") as f:
    json.dump(result.to_dict(), f, indent=2)
```

##### `summary() -> str`

Return a human-readable summary string.

```python
print(result.summary())
# "example.com scores 56/100 (Tier 3: Fair). Top issue: Missing FAQPage schema."
```

---

### `SignalResult`

Represents the score for one of the 7 signals.

| Attribute | Type | Description |
|-----------|------|-------------|
| `name` | `str` | Signal name (e.g., "schema_completeness") |
| `label` | `str` | Human-readable label ("Schema Completeness") |
| `score` | `float` | Raw score |
| `max_score` | `float` | Maximum possible score |
| `weight` | `float` | Signal weight in overall calculation |
| `issues` | `List[str]` | Specific issues found |
| `status` | `str` | "pass", "warn", or "fail" |

---

### `Recommendation`

An actionable fix recommendation.

| Attribute | Type | Description |
|-----------|------|-------------|
| `priority` | `int` | Priority rank (1 = highest) |
| `title` | `str` | Short description of the fix |
| `description` | `str` | Detailed explanation |
| `category` | `str` | "Critical", "High", "Medium", "Enhancement", "Strategic" |
| `impact` | `int` | Expected score improvement (1-10) |
| `fix_time` | `str` | Human-readable time estimate ("5 minutes", "2-4 weeks") |
| `is_quick_win` | `bool` | Whether this is the recommended "Quick Win" |
| `steps` | `List[str]` | Step-by-step instructions |
| `signal` | `str` | Which signal this addresses |

---

### `ComparisonResult`

Returned by `compare()`.

| Attribute | Type | Description |
|-----------|------|-------------|
| `url_a` | `AnalysisResult` | First URL's full result |
| `url_b` | `AnalysisResult` | Second URL's full result |
| `score_gap` | `int` | Score difference (url_a - url_b) |
| `gaps` | `List[Gap]` | Specific areas where url_b outperforms url_a |
| `winner` | `str` | Which URL scores higher ("a", "b", or "tie") |

---

### `PlatformResults`

Per-platform AI visibility status.

| Attribute | Type | Description |
|-----------|------|-------------|
| `chatgpt` | `PlatformStatus` | ChatGPT visibility |
| `perplexity` | `PlatformStatus` | Perplexity visibility |
| `google_aio` | `PlatformStatus` | Google AI Overviews visibility |
| `claude` | `PlatformStatus` | Claude visibility |

---

### `PlatformStatus`

| Attribute | Type | Description |
|-----------|------|-------------|
| `mentioned` | `bool` | Whether the domain was mentioned |
| `prominence` | `str` | "primary", "secondary", "passing", or "none" |
| `sentiment` | `str` | "positive", "neutral", "negative", or "n/a" |
| `quote` | `Optional[str]` | Sample mention text (if available) |

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RANKFIXER_API_KEY` | — | API key for commercial features |
| `RANKFIXER_CACHE_DIR` | `~/.rankfixer/cache` | Cache directory for analysis results |
| `RANKFIXER_LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |
| `RANKFIXER_MAX_CONCURRENT` | `5` | Default max concurrent for batch operations |

---

## Error Handling

```python
from rankfixer_core import Analyzer, AnalysisError

analyzer = Analyzer()

try:
    result = analyzer.analyze("https://example.com")
except ValueError as e:
    print(f"Invalid URL: {e}")
except TimeoutError as e:
    print(f"Request timed out: {e}")
except AnalysisError as e:
    print(f"Analysis failed: {e}")
```

---

## CLI Usage

RankFixer Core also ships with a CLI:

```bash
# Single URL analysis
rankfixer analyze https://example.com

# Batch analysis from file
rankfixer batch domains.txt --output results.json

# Compare two domains
rankfixer compare example.com competitor.com

# Export as JSON
rankfixer analyze https://example.com --format json > report.json

# Show help
rankfixer --help
```
