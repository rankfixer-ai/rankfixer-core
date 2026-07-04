"""
RankFixer Competitive Intel — loads weekly crawl data from the intel pipeline
and provides comparison methods against analyzed sites.

Reads from ~/rankfixer-intel/data/raw/ (configurable via RANKFIXER_INTEL_PATH).
"""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Feature cleaning: fragments that are UI chrome, not product features
# ---------------------------------------------------------------------------
_RE_LANGUAGE_SWITCHER = re.compile(
    r"^(english|deutsch|français|español|português|italiano|"
    r"日本語|简体中文|繁體中文|한국어|русский|العربية|"
    r"中文|中文（简体）|中文（繁體）|"
    r"nederlands|svenska|norsk|dansk|suomi|polski|"
    r"türkçe|ภาษาไทย|tiếng việt|bahasa indonesia)$",
    re.IGNORECASE,
)

# Set of language names (lowercased) for detecting multi-language dumps
_LANG_NAMES: set[str] = {
    "english", "deutsch", "français", "español", "português",
    "italiano", "日本語", "简体中文", "繁體中文", "한국어",
    "русский", "العربية", "中文", "nederlands", "svenska",
    "norsk", "dansk", "suomi", "polski", "türkçe", "ภาษาไทย",
    "tiếng việt", "bahasa indonesia", "čeština", "magyar",
    "română", "українська", "български", "hrvatski",
    "slovenčina", "slovenščina", "latviešu", "lietuvių",
    "eesti", "íslenska", "català", "euskara", "galego",
    "हिन्दी", "বাংলা", "தமிழ்", "తెలుగు", "मराठी",
    "ગુજરાતી", "ಕನ್ನಡ", "മലയാളം", "ਪੰਜਾਬੀ",
}

# Nav-section keywords that start multi-entry nav dumps
_NAV_DUMP_PREFIXES: set[str] = {
    "product", "learn", "company", "resources", "solutions",
    "platform", "use cases", "services",
}

# Stat/metric patterns
_RE_STAT_METRIC = re.compile(r"[↑↓]|\\d+%\\s*[↑↓]|[\\d.]+K?\\s*[↑↓]")

_NAV_LABELS: set[str] = {
    "about", "about us", "blog", "careers", "case studies",
    "case study", "contact", "contact us", "contact sales",
    "docs", "documentation", "faq", "help center", "help",
    "home", "integrations", "log in", "login", "logout",
    "partners", "press", "pricing", "pricing & plans",
    "pricing and plans", "privacy", "privacy policy",
    "product", "resources", "sign in", "sign up",
    "solutions", "support", "terms", "terms of service",
    "trust center", "webinars", "press & awards",
    "press releases", "newsroom",
}

_CTA_LABELS: set[str] = {
    "book a demo", "get a demo", "get demo", "request a demo",
    "request demo", "start free trial", "free trial", "try for free",
    "try free", "start now", "get started", "get started free",
    "sign up free", "sign up for free", "talk to sales",
    "contact sales", "get in touch", "request a quote",
    "see pricing", "view pricing", "explore platform",
    "learn more", "discover more", "see how it works",
    "download", "subscribe", "buy now", "get the app",
}

_SECTION_LABELS: set[str] = {
    "by use case", "by industry", "by role", "for enterprises",
    "for non-profits", "for small business", "for agencies",
    "why marketmuse?", "customer love", "customer stories",
    "customer reviews", "compare plans", "pricing plans",
    "all features", "feature overview", "feature comparison",
    "product updates", "what's new", "release notes",
    "technical support", "customer support", "customer success",
    "professional services", "training", "academy",
    "api", "api reference", "api documentation",
    "developer", "developers", "developer hub",
    "guides", "knowledge base", "marketmuse academy",
    "content strategy crash course",
    "enterprises", "growing business", "agencies",
    "small business", "freelancers", "startups",
    "marketing teams", "seo professionals",
}

# Curated fallback features per competitor — used when scraped list < 5 items
_CURATED_FEATURES: dict[str, list[str]] = {
    "Semrush": [
        "Keyword Research", "Rank Tracking", "Site Audit",
        "Backlink Analysis", "Competitor Analysis", "Content Optimization",
        "AI Visibility Tracking", "PPC Analytics",
        "Social Media Management", "Reporting",
    ],
    "Ahrefs": [
        "Backlink Analysis", "Keyword Research", "Rank Tracking",
        "Site Audit", "Content Explorer", "Competitor Analysis",
        "AI Content Grader", "Traffic Analytics",
    ],
    "Surfer SEO": [
        "Content Optimization", "AI Content Editor", "SERP Analyzer",
        "Keyword Research", "Content Planner", "Plagiarism Checker",
        "AI Detection", "Internal Linking Suggestions",
    ],
    "Clearscope": [
        "Content Optimization", "Keyword Research", "Content Grading",
        "AI Content Outlines", "SERP Analytics", "Content Monitoring",
    ],
    "MarketMuse": [
        "Content Strategy", "Content Briefs", "Competitive Analysis",
        "Content Planning", "Content Optimization", "Topic Modeling",
    ],
    "SE Ranking": [
        "Rank Tracking", "Keyword Research", "Website Audit",
        "Backlink Checker", "Competitor Analysis", "AI Overviews Tracking",
        "White Label Reporting", "Social Media Management",
    ],
    "Copy.ai": [
        "AI Content Generation", "Workflow Automation", "GTM Workflows",
        "Brand Voice", "Content Creation", "Prospecting",
        "Integrations", "Lead Processing",
    ],
    "Jasper AI": [
        "AI Agents", "Marketing Workflows", "Brand Voice",
        "Content Creation", "Campaign Management", "AI Writing",
        "SEO Mode", "Audience Insights",
    ],
    "Writesonic": [
        "AI Search Tracking", "Content Generation", "AI Articles",
        "GEO Optimization", "Sentiment Analysis", "AI Visibility",
        "Site Audit", "Action Center",
    ],
    "Rytr": [
        "AI Writing", "Content Generation", "Plagiarism Checker",
        "Brand Voice", "Browser Extension", "Use Case Templates",
    ],
    "Phrase": [
        "Translation Management", "Localization", "AI Translation",
        "Quality Evaluation", "Workflow Automation", "Integrations",
        "Analytics", "Terminology Management",
    ],
}

# ---------------------------------------------------------------------------
# Helpers used by the cleaners
# ---------------------------------------------------------------------------

_RE_REPEATED_PATTERN = re.compile(r"(.+?)\1{2,}", re.IGNORECASE)
"""Matches a substring repeated 3+ times consecutively, e.g.
'Get a DemoGet a DemoGet a Demo' or 'CompanyCompanyCompany'."""


def _has_repeated_pattern(text: str) -> bool:
    """True when *text itself* looks like a repeated concatenation.

    We check two signals:
    1. The whole string matches ``(substring)\\1{2,}``.
    2. The string contains a run of 6+ identical uppercase/camel fragments
       (catches 'CompanyCompanyCompany' even when the regex needs tuning).
    """
    if len(text) < 9:               # too short to be a meaningful repetition
        return False
    # Signal 1: regex
    if _RE_REPEATED_PATTERN.fullmatch(text):
        return True
    # Signal 2: 6+ consecutive same-capital-letter runs (e.g. CompanyCompanyCo...)
    count = 1
    max_run = 1
    for i in range(1, len(text)):
        if text[i].isupper() and text[i - 1].isupper():
            count += 1
            max_run = max(max_run, count)
        else:
            count = 1
    if max_run >= 6:
        return True
    # Signal 3: common repeated CTA pattern
    if "get a demoget a demo" in text or "get demoget demo" in text:
        return True
    return False


# Stat/metric fragments like "Claude49.8%↑ 5%"
_RE_STAT_METRIC = re.compile(r"[↑↓]|[\\d.]+K?\\s*[↑↓]|\\d+%\\s*[↑↓]")


def _is_stat_metric(text: str) -> bool:
    """True when text is clearly a stats/metrics display fragment."""
    if "↑" in text or "↓" in text:
        return True
    # e.g. "Claude49.8%  5%" or "Gemini44.2%  2%"
    if re.search(r"[A-Z][a-z]+\\d+[\\d.]*%", text):
        return True
    return False


def _has_language_dump(text: str) -> bool:
    """True when text contains multiple language names concatenated."""
    words = text.lower().split()
    if len(words) < 3:
        return False
    lang_hits = sum(1 for w in words if w in _LANG_NAMES)
    return lang_hits >= 3


def _is_nav_dump(text: str) -> bool:
    """True when text looks like a nav-menu blob — starts with a
    section label followed by many title-case entries."""
    words = text.split()
    if len(words) < 5:
        return False
    first_lower = words[0].lower().rstrip(":")
    if first_lower not in _NAV_DUMP_PREFIXES:
        return False
    # Count title-case words after the prefix
    title_case_words = 0
    for w in words[1:]:
        if w and w[0].isupper() and w[0].isalpha():
            title_case_words += 1
    return title_case_words >= 4


def _has_camelcase_concat(text: str) -> bool:
    """True when text has runs of CamelCase words fused together,
    e.g. 'CanvasMarketing AI EditorJasper Chat'."""
    # Look for a lowercase→uppercase transition without a space
    for i in range(len(text) - 1):
        if text[i].islower() and text[i + 1].isupper() and text[i + 2:i + 3] and text[i + 2].islower():
            return True
    return False


_MARKETING_TAGLINES = re.compile(
    r"(embeds|delivers|transforms|drives|powers|unlocks|enables|"
    r"from the start|for the|built for|designed for|"
    r"the (world'?s?|first|only|leading|best|fastest|most|ultimate))",
    re.IGNORECASE,
)


def _is_marketing_tagline(text: str) -> bool:
    """True when text reads like a marketing blurb rather than a feature name."""
    low = text.lower()
    if _MARKETING_TAGLINES.search(low):
        # Must also look like a sentence (has a verb/determiner pattern)
        # and be long enough to be a tagline
        if len(low) > 30 and (" " in low):
            return True
    # "Connect Book a Demo Book Jeff Coyle for Your Event" type
    if low.startswith("connect ") and low.count("book") >= 2:
        return True
    return False


_FAQ_GATE = re.compile(
    r"^(what|how|can|do|is|are|will|does|should|where|when|who|why)\b",
    re.IGNORECASE,
)


def _is_faq_snippet(text: str) -> bool:
    """True when text looks like an FAQ question rather than pricing data."""
    stripped = text.strip().rstrip("?").strip()
    if len(stripped) < 8:
        return False
    if _FAQ_GATE.match(stripped) and len(stripped) > 15:
        return True
    # Also catch "refund policy", "payment methods", "customer demo" etc.
    faq_markers = (
        "refund policy", "payment method", "customer demo",
        "cancel my", "cancel your", "how do i", "how much",
        "what is", "can i", "do i", "is there",
    )
    return any(m in stripped for m in faq_markers)


class CompetitiveIntel:
    """
    Loads the latest competitive intelligence crawl data and provides
    comparison queries against analyzed sites.

    Usage:
        intel = CompetitiveIntel()
        report = intel.compare(analyzed_site_data)
        print(report["competitor_count"])
    """

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def __init__(self, intel_path: str | None = None) -> None:
        """
        Args:
            intel_path: Path to the rankfixer-intel directory.
                        Defaults to RANKFIXER_INTEL_PATH env var,
                        then ~/rankfixer-intel.
        """
        self._intel_dir = Path(
            intel_path
            or os.environ.get("RANKFIXER_INTEL_PATH", "")
            or Path.home() / "rankfixer-intel"
        )
        self._raw_dir = self._intel_dir / "data" / "raw"
        self._competitors: list[dict[str, Any]] = []
        self._loaded_at: datetime | None = None
        self._load_error: str | None = None
        self._load()

    @property
    def competitor_count(self) -> int:
        """Number of competitors with loaded data."""
        return len(self._competitors)

    @property
    def is_fresh(self) -> bool:
        """True if data was loaded successfully and is under 8 days old."""
        if not self._loaded_at:
            return False
        return (datetime.now(timezone.utc) - self._loaded_at).days < 8

    @property
    def load_status(self) -> dict[str, Any]:
        """Diagnostic information about the data load."""
        return {
            "path": str(self._raw_dir),
            "competitors_loaded": len(self._competitors),
            "loaded_at": self._loaded_at.isoformat() if self._loaded_at else None,
            "is_fresh": self.is_fresh,
            "error": self._load_error,
        }

    def get_competitor(self, competitor_id: str) -> dict[str, Any] | None:
        """Get a single competitor's latest data by ID (e.g. 'semrush')."""
        for c in self._competitors:
            if c.get("id") == competitor_id:
                return c
        return None

    def list_competitors(self) -> list[dict[str, str]]:
        """Return summary list: [{id, name, domain}, ...]."""
        return [
            {"id": c["id"], "name": c["name"], "domain": c.get("domain", "")}
            for c in self._competitors
        ]

    def compare(
        self, analyzed_site: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Generate a competitive comparison against the analyzed site.

        The analyzed_site dict should be the output of Analyzer.analyze() —
        but any dict with 'site' and 'templates' keys will work.

        Returns a dict with:
            competitor_count, competitors_summary, pricing_comparison,
            feature_comparison, positioning_summary, data_freshness
        """
        if not self._competitors:
            return {
                "competitor_count": 0,
                "available": False,
                "message": (
                    "Competitive intel data unavailable. "
                    + (self._load_error or "No crawl data found.")
                ),
                "data_path": str(self._raw_dir),
            }

        site_meta = analyzed_site.get("meta", {})
        site_info = analyzed_site.get("site", {})

        # Extract site features from templates
        site_features: set[str] = set()
        site_issues: list[str] = []
        for tpl in analyzed_site.get("templates", []):
            for issue in tpl.get("templateIssues", []):
                site_issues.append(issue.get("message", ""))
            for issue in tpl.get("pageIssues", []):
                site_issues.append(issue.get("message", ""))

        # Competitor summaries
        summaries = []
        all_competitor_features: dict[str, list[str]] = {}
        all_competitor_pricing: dict[str, list[dict]] = {}
        all_competitor_positioning: dict[str, str] = {}

        for comp in self._competitors:
            hp = (comp.get("pages") or {}).get("/", {})
            pricing = (comp.get("pages") or {}).get("/pricing", {})
            features = (comp.get("pages") or {}).get("/features", {})
            blog = (comp.get("pages") or {}).get("/blog", {})

            h1 = (hp.get("h1") or [None])[0] or ""
            ctas = hp.get("cta", [])
            meta = hp.get("metaDescription", "")

            summaries.append({
                "id": comp.get("id"),
                "name": comp.get("name"),
                "domain": comp.get("domain"),
                "h1": h1[:120],
                "ctas": ctas[:5],
                "meta": meta[:200] if meta else "",
                "pricing_tiers": len(pricing.get("tiers", [])),
                "feature_count": len(features.get("features", [])),
                "blog_post_count": len(blog.get("posts", [])),
            })

            all_competitor_features[comp.get("name", "")] = features.get("features", [])
            all_competitor_pricing[comp.get("name", "")] = pricing.get("tiers", [])
            all_competitor_positioning[comp.get("name", "")] = h1[:120]

        # Pricing comparison: surface cheapest/enterprise tiers across competitors
        pricing_comparison = self._build_pricing_comparison(all_competitor_pricing)

        # Feature comparison: surface features competitors have that the
        # analyzed site might be missing (we can only compare against what
        # the analyzed site mentions — full gap requires LLM analysis)
        feature_comparison = self._build_feature_comparison(all_competitor_features, site_features)

        # Positioning summary: how competitors describe themselves vs the site
        positioning_summary = {
            "site_archetype": site_info.get("archetype", "unknown"),
            "site_page_count": site_info.get("totalPages", 0),
            "site_issues_found": len(site_issues),
            "competitor_positioning": all_competitor_positioning,
            "insight": (
                "Review competitor positioning statements (H1s) to identify "
                "messaging gaps. Semrush leads with 'Be found everywhere search "
                "happens' — are you matching that breadth claim?"
            ),
        }

        return {
            "competitor_count": len(self._competitors),
            "available": True,
            "competitors_summary": summaries,
            "pricing_comparison": pricing_comparison,
            "feature_comparison": feature_comparison,
            "positioning_summary": positioning_summary,
            "data_freshness": {
                "loaded_at": self._loaded_at.isoformat() if self._loaded_at else None,
                "is_fresh": self.is_fresh,
                "crawl_path": str(self._raw_dir),
            },
        }

    # ------------------------------------------------------------------
    # Feature & pricing cleaners
    # ------------------------------------------------------------------

    @staticmethod
    def _clean_features(
        features: list[str], competitor_name: str
    ) -> list[str]:
        """Clean a raw feature list from the scraper.

        Deduplicates, removes UI chrome, and returns max 15 features.
        Falls back to curated features when the cleaned list is too short.
        """
        # Step 1: normalize — strip whitespace, collapse internal \n and \t
        normalized: list[str] = []
        for f in features:
            cleaned = " ".join(f.split())
            if cleaned:
                normalized.append(cleaned)

        # Step 2: classify each candidate
        keep: list[str] = []
        for f in normalized:
            low = f.lower()

            # --- Skip: language switchers ---
            if _RE_LANGUAGE_SWITCHER.match(f):
                continue

            # --- Skip: nav / CTA / section labels ---
            if low in _NAV_LABELS:
                continue
            if low in _CTA_LABELS:
                continue
            if low in _SECTION_LABELS:
                continue

            # --- Skip: repeated-word-to-separator patterns ---
            # e.g. "CompanyCompanyCompany" or "Get a DemoGet a DemoGet a Demo"
            if _has_repeated_pattern(low):
                continue

            # --- Skip: nav-menu dumps (tab-delimited multi-entries) ---
            if "\t" in f and len(f.split("\t")) >= 3:
                continue

            # --- Skip: multi-language switcher dumps ---
            if _has_language_dump(f):
                continue

            # --- Skip: nav-menu section blobs ---
            if _is_nav_dump(f):
                continue

            # --- Skip: stat/metric fragments ---
            if _is_stat_metric(f):
                continue

            # --- Skip: CamelCase concatenation ---
            if _has_camelcase_concat(f):
                continue

            # --- Skip: marketing taglines ---
            if _is_marketing_tagline(f):
                continue

            # --- Skip: FAQ-like entries sneaking in ---
            if _is_faq_snippet(low):
                continue

            # --- Skip: very short or very long ---
            if len(f) < 3 or len(f) > 120:
                continue

            keep.append(f)

        # Step 3: case-insensitive dedup (preserve first occurrence)
        seen: set[str] = set()
        deduped: list[str] = []
        for f in keep:
            key = f.lower()
            if key not in seen:
                seen.add(key)
                deduped.append(f)

        # Step 4: if too few, fall back to curated list
        if len(deduped) < 5:
            fallback = _CURATED_FEATURES.get(competitor_name)
            if fallback:
                return fallback[:15]

        # Step 5: cap at 15
        return deduped[:15]

    @staticmethod
    def _clean_pricing_tiers(
        tiers: list[dict[str, Any]],
        competitor_name: str = "",
    ) -> list[dict[str, Any]]:
        """Clean pricing tiers. Two paths:

        1. If data is too fragmented (>4 deduped tiers, truncated entries,
           or majority unknown names), collapse to a single clean line.
        2. Otherwise return the tiers as-is — they're clean enough to display.
        """
        if not tiers:
            return []

        # Deduplicate by (name, price) — keep first occurrence.
        # Drop FAQ detritus along the way.
        seen: set[tuple[str, str]] = set()
        deduped: list[dict[str, Any]] = []
        unknown_count = 0
        has_truncated = False  # tier with a name but no captured price

        for t in tiers:
            name = (t.get("name") or "").strip()
            price = (t.get("price") or "").strip()

            # Drop FAQ junk that leaked into the pricing scrape
            snippet = (t.get("snippet") or "").strip().lower()
            if _is_faq_snippet(snippet):
                continue

            # Drop rows where *both* name and price are empty / unknown
            if (not name or name.lower() == "unknown") and (
                not price or price.lower() in ("contact for pricing", "unknown", "-")
            ):
                continue

            key = (name.lower(), price.lower() if price else "")
            if key in seen:
                continue
            seen.add(key)

            deduped.append({"name": name, "price": price})

            if not name or name.lower() == "unknown":
                unknown_count += 1
            if name and not price:
                has_truncated = True

        if not deduped:
            return []

        # --- Collapse gate ---
        # Collapse if the data is too fragmented to display usefully.
        too_many = len(deduped) > 6

        if too_many or has_truncated:
            label = competitor_name or "competitor"
            return [{
                "name": "Custom",
                "price": f"Custom/tiered pricing — see {label} website",
                "snippet": "",
            }]

        return deduped

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _load(self) -> None:
        """Load the latest crawl result for each competitor."""
        if not self._raw_dir.is_dir():
            self._load_error = f"Intel data directory not found: {self._raw_dir}"
            return

        try:
            files = sorted(
                [f for f in self._raw_dir.iterdir()
                 if f.suffix == ".json" and not f.name.startswith("_")],
                key=lambda f: f.name,
            )
        except OSError as exc:
            self._load_error = f"Cannot read intel directory: {exc}"
            return

        if not files:
            self._load_error = f"No JSON files in {self._raw_dir}"
            return

        # Group by competitor ID, take latest timestamp
        # Filename format: {id}-YYYY-MM-DDTHH-MM-SS-SSSZ.json
        # The timestamp always starts with a 4-digit year, so we split on that.
        import re
        _TS_RE = re.compile(r"-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3,4}Z)\.json$")

        by_id: dict[str, tuple[str, datetime]] = {}
        for f in files:
            m = _TS_RE.search(f.name)
            if not m:
                continue
            comp_id = f.name[: m.start()]
            ts_str = m.group(1)
            # Filename uses hyphens as separators: YYYY-MM-DDTHH-MM-SS-SSSZ
            # Convert to ISO format with colon/dot: YYYY-MM-DDTHH:MM:SS.SSS+00:00
            try:
                # Split the parts: YYYY-MM-DD T HH-MM-SS-SSS Z
                date_part, time_part = ts_str.split("T")
                time_parts = time_part.replace("Z", "").split("-")
                if len(time_parts) == 4:  # HH, MM, SS, SSS
                    iso_ts = f"{date_part}T{time_parts[0]}:{time_parts[1]}:{time_parts[2]}.{time_parts[3]}+00:00"
                else:
                    iso_ts = ts_str.replace("Z", "+00:00")
                ts = datetime.fromisoformat(iso_ts)
                if comp_id not in by_id or ts > by_id[comp_id][1]:
                    by_id[comp_id] = (f.name, ts)
            except (ValueError, IndexError):
                continue

        # Load each latest file
        loaded: list[dict[str, Any]] = []
        for comp_id, (filename, ts) in by_id.items():
            filepath = self._raw_dir / filename
            try:
                data = json.loads(filepath.read_text(encoding="utf-8"))
                loaded.append(data)
            except (json.JSONDecodeError, OSError) as exc:
                self._load_error = f"Failed to load {filename}: {exc}"
                continue

        self._competitors = loaded
        self._loaded_at = datetime.now(timezone.utc)

    def _build_pricing_comparison(
        self, all_pricing: dict[str, list[dict]]
    ) -> dict[str, Any]:
        """Extract cleaned pricing tiers across competitors."""
        summary: list[dict[str, Any]] = []
        price_points: list[float] = []

        for name, raw_tiers in all_pricing.items():
            tiers = self._clean_pricing_tiers(raw_tiers, name)
            if not tiers:
                summary.append({
                    "name": name,
                    "tier_count": 0,
                    "prices": ["Contact for pricing"],
                })
                continue

            extracted_prices: list[str] = []
            for t in tiers:
                price_str = t.get("price", "")
                name_str = t.get("name", "")

                # Collapsed tier: the price field IS the full display message
                if name_str == "Custom" and price_str.startswith("Custom/tiered pricing"):
                    extracted_prices.append(price_str)
                elif price_str and price_str.lower() != "contact for pricing":
                    extracted_prices.append(f"{name_str or 'Plan'}: {price_str}")
                    nums = re.findall(r"[\$€£]?(\d+(?:\.\d{2})?)", price_str)
                    for n in nums:
                        try:
                            price_points.append(float(n))
                        except ValueError:
                            pass
                else:
                    extracted_prices.append(f"{name_str or 'Plan'}: Contact for pricing")

            summary.append({
                "name": name,
                "tier_count": len(tiers),
                "prices": extracted_prices,
            })

        price_range = None
        if price_points:
            price_range = {
                "min": min(price_points),
                "max": max(price_points),
                "avg": round(sum(price_points) / len(price_points), 2),
            }

        return {
            "competitors_with_pricing": summary,
            "price_range": price_range,
            "insight": (
                "Compare your pricing tier structure to the competitive range. "
                "Most competitors in this space offer a free tier or trial."
            ) if price_range else "Pricing data is sparse — most competitors use 'Contact Us' pricing.",
        }

    def _build_feature_comparison(
        self,
        all_features: dict[str, list[str]],
        _site_features: set[str],
    ) -> dict[str, Any]:
        """Summarize competitor feature lists using cleaned features."""
        summary: list[dict[str, Any]] = []
        all_unique: set[str] = set()

        for name, raw_features in all_features.items():
            cleaned = self._clean_features(raw_features, name)
            all_unique.update(f[:100] for f in cleaned)
            summary.append({
                "name": name,
                "feature_count": len(cleaned),
                "top_features": cleaned[:8],
            })

        return {
            "competitors": summary,
            "common_features": sorted(all_unique)[:20],
            "insight": (
                "Common features across competitors indicate table-stakes "
                "functionality. Missing these puts you at a discoverability "
                "disadvantage in AI search results."
            ),
        }
