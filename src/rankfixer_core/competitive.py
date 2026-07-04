"""
RankFixer Competitive Intel — loads weekly crawl data from the intel pipeline
and provides comparison methods against analyzed sites.

Reads from ~/rankfixer-intel/data/raw/ (configurable via RANKFIXER_INTEL_PATH).
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


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
        """Extract pricing tiers across competitors."""
        summary: list[dict[str, Any]] = []
        price_points: list[float] = []

        for name, tiers in all_pricing.items():
            extracted_prices: list[str] = []
            for t in tiers:
                price_str = t.get("price", "")
                if price_str and price_str != "Contact for pricing":
                    extracted_prices.append(f"{t.get('name', '?')}: {price_str}")
                    # Try to extract a numeric price
                    import re
                    nums = re.findall(r"\$?(\d+(?:\.\d{2})?)", price_str)
                    for n in nums:
                        try:
                            price_points.append(float(n))
                        except ValueError:
                            pass
            summary.append({
                "name": name,
                "tier_count": len(tiers),
                "prices": extracted_prices[:5] if extracted_prices else ["Contact for pricing"],
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
        """Summarize competitor feature lists."""
        summary: list[dict[str, Any]] = []
        all_unique = set()

        for name, features in all_features.items():
            cleaned = [f[:100] for f in features if len(f) > 3]
            all_unique.update(cleaned[:10])
            summary.append({
                "name": name,
                "feature_count": len(features),
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
