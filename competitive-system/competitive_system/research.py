"""
research.py — Phase 0: scrape, classify, score competitors.

This module implements:
- competitor discovery via source manifests and seed lists
- classification: direct / adjacent / partner
- threat scoring + feature-gap pre-scan
"""

from __future__ import annotations

import json
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from .schema import CompetitorProfile, CompetitorType, ThreatLevel


class ResearchEngine:
    """
    Discovers competitors from ranked lists, classifies them,
    and scores threat levels.
    """

    def __init__(
        self,
        data_dir: Path | None = None,
        seed_path: Path | None = None,
    ) -> None:
        repo_root = Path(__file__).resolve().parent.parent.parent
        self.data_dir = data_dir or repo_root / "competitive-system" / "data"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.seed_path = seed_path or repo_root / "competitive-system" / "data" / "seeds.json"

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run(self, seed_override: list[dict[str, Any]] | None = None) -> dict[str, Any]:
        """
        Run the research phase and persist results to data/.
        """
        sources = self._load_sources(seed_override)
        competitors = self._discover_competitors(sources)
        scored = self._score_competitors(competitors)

        # Persist
        export_path = self.data_dir / "competitors.json"
        export = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "competitors": [c.dict() for c in scored],
        }
        export_path.write_text(json.dumps(export, indent=2, default=str), encoding="utf-8")

        return {
            "competitors_found": len(scored),
            "competitors": [self._summarize(c) for c in scored],
            "export_path": str(export_path),
        }

    # ------------------------------------------------------------------
    # Discovery
    # ------------------------------------------------------------------

    def _load_sources(
        self, seed_override: list[dict[str, Any]] | None = None
    ) -> list[dict[str, Any]]:
        if seed_override:
            return self._normalize_sources(seed_override)
        if self.seed_path.exists():
            try:
                raw = json.loads(self.seed_path.read_text(encoding="utf-8"))
                return self._normalize_sources(raw)
            except (json.JSONDecodeError, OSError):
                pass
        return self._normalize_sources(self._default_seeds())

    @staticmethod
    def _normalize_sources(raw: Any) -> list[dict[str, Any]]:
        if isinstance(raw, dict):
            raw = raw.get("sources", raw.get("competitors", []))
        if not isinstance(raw, list):
            return []
        out: list[dict[str, Any]] = []
        for item in raw:
            if isinstance(item, dict):
                out.append(item)
            elif isinstance(item, str):
                out.append({"id": item, "name": item, "domain": item, "types": ["direct"]})
        return out

    @staticmethod
    def _default_seeds() -> list[dict[str, Any]]:
        # Pull from the existing curated competitor data in rankfixer_core
        return [
            {
                "id": "semrush",
                "name": "Semrush",
                "domain": "semrush.com",
                "source": "rankfixer_core/competitive.py curated fallback",
                "types": ["direct"],
            },
            {
                "id": "ahrefs",
                "name": "Ahrefs",
                "domain": "ahrefs.com",
                "source": "rankfixer_core/competitive.py curated fallback",
                "types": ["direct"],
            },
            {
                "id": "surfer-seo",
                "name": "Surfer SEO",
                "domain": "surferseo.com",
                "source": "rankfixer_core/competitive.py curated fallback",
                "types": ["direct"],
            },
            {
                "id": "clearscope",
                "name": "Clearscope",
                "domain": "clearscope.io",
                "source": "rankfixer_core/competitive.py curated fallback",
                "types": ["adjacent"],
            },
            {
                "id": "marketmuse",
                "name": "MarketMuse",
                "domain": "marketmuse.com",
                "source": "rankfixer_core/competitive.py curated fallback",
                "types": ["direct"],
            },
            {
                "id": "se-ranking",
                "name": "SE Ranking",
                "domain": "seranking.com",
                "source": "rankfixer_core/competitive.py curated fallback",
                "types": ["direct"],
            },
            {
                "id": "copy-ai",
                "name": "Copy.ai",
                "domain": "copy.ai",
                "source": "rankfixer_core/competitive.py curated fallback",
                "types": ["adjacent"],
            },
            {
                "id": "jasper-ai",
                "name": "Jasper AI",
                "domain": "jasper.ai",
                "source": "rankfixer_core/competitive.py curated fallback",
                "types": ["adjacent"],
            },
            {
                "id": "writesonic",
                "name": "Writesonic",
                "domain": "writesonic.com",
                "source": "rankfixer_core/competitive.py curated fallback",
                "types": ["adjacent"],
            },
        ]

    def _discover_competitors(
        self, sources: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        competitors: list[dict[str, Any]] = []
        seen: set[str] = set()
        for source in sources:
            cid = str(source.get("id", "")).strip()
            name = str(source.get("name", "")).strip()
            domain = str(source.get("domain", "")).strip().lower()
            if not cid or not name or not domain:
                continue
            if cid in seen:
                continue
            seen.add(cid)
            competitors.append(
                {
                    "id": cid,
                    "name": name,
                    "domain": domain,
                    "types": source.get("types", ["direct"]),
                }
            )
        return competitors

    # ------------------------------------------------------------------
    # Classification + scoring
    # ------------------------------------------------------------------

    def _score_competitors(
        self, competitors: list[dict[str, Any]]
    ) -> list[CompetitorProfile]:
        scored: list[CompetitorProfile] = []
        for c in competitors:
            comp_type = self._classify(c)
            threat = self._threat_score(c, comp_type)
            features, pricing = self._load_curated_facts(c)
            gaps = self._preliminary_gaps(c, features)
            profile = CompetitorProfile(
                id=c["id"],
                name=c["name"],
                domain=c["domain"],
                competitor_type=comp_type,
                threat=threat,
                features=features,
                pricing=pricing,
                gaps=gaps,
                score=round(self._numeric_score(threat) + self._gap_bonus(gaps), 2),
                raw={"seed_types": c.get("types", [])},
            )
            scored.append(profile)
        scored.sort(key=lambda x: x.score, reverse=True)
        return scored

    @staticmethod
    def _classify(competitor: dict[str, Any]) -> CompetitorType:
        raw_types = [str(t).lower() for t in competitor.get("types", ["direct"])]
        if "partner" in raw_types:
            return CompetitorType.partner
        if "adjacent" in raw_types:
            return CompetitorType.adjacent
        return CompetitorType.direct

    def _threat_score(self, competitor: dict[str, Any], comp_type: CompetitorType) -> ThreatLevel:
        domain = competitor.get("domain", "")
        score = 0
        if domain.endswith(".com"):
            score += 1
        if any(k in domain for k in ["seo", "geo", "ai", "search", "rank"]):
            score += 1
        if comp_type == CompetitorType.direct:
            score += 1
        if score >= 3:
            return ThreatLevel.medium
        if score == 2:
            return ThreatLevel.low
        return ThreatLevel.none

    @staticmethod
    def _numeric_score(threat: ThreatLevel) -> float:
        return {"NONE": 0.0, "LOW": 1.0, "MEDIUM": 2.0, "HIGH": 3.0}[threat.value]
    @staticmethod
    def _load_curated_facts(
        competitor: dict[str, Any],
    ) -> tuple[list[str], list[dict[str, Any]]]:
        import sys
        from pathlib import Path
        repo_root = Path(__file__).resolve().parent.parent.parent
        src_dir = repo_root / "src"
        if str(src_dir) not in sys.path:
            sys.path.append(str(src_dir))
        try:
            from rankfixer_core.competitive import _CURATED_FEATURES  # type: ignore[attr-defined]
        except Exception:
            _CURATED_FEATURES = {}
        name = competitor.get("name", "")
        features = list(_CURATED_FEATURES.get(name, []))[:12]
        # Use synthetic pricing until scraped data exists.
        pricing = [{"name": "See website", "price": "Contact for pricing"}]
        return features, pricing

    def _preliminary_gaps(
        self, competitor: dict[str, Any], features: list[str]
    ) -> list[str]:
        gap_candidates = [
            "governance proof",
            "autonomous sales pipeline",
            "31-pillar verification",
            "ai-readiness verification pipeline",
            "website authority auditing",
            "citation governance",
            "predictive roadmap",
        ]
        normalized = {f.lower() for f in features}
        return [g for g in gap_candidates if g not in normalized]

    def _gap_bonus(self, gaps: list[str]) -> float:
        return round(len(gaps) * 0.25, 2)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _summarize(profile: CompetitorProfile) -> dict[str, Any]:
        return {
            "id": profile.id,
            "name": profile.name,
            "domain": profile.domain,
            "type": profile.competitor_type.value,
            "threat": profile.threat.value,
            "score": profile.score,
            "feature_count": len(profile.features),
            "gaps": profile.gaps,
        }
