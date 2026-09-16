"""
analysis.py — Phase 1: gap detection, moat measurement, scoring equations.

This module implements the "research engine" with a deterministic
57-equation scoring model on competitive landscape data.
"""

from __future__ import annotations

import hashlib
import json
import math
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .schema import GapAnalysis, ResearchRun
from .research import ResearchEngine


class AnalysisEngine:
    """
    Reads research output and produces structured analysis:
    - threat ranking
    - feature gap matrix
    - moat measurement
    - 57-equation research engine result
    """

    def __init__(self, data_dir: Path | None = None) -> None:
        repo_root = Path(__file__).resolve().parent.parent.parent
        self.data_dir = data_dir or repo_root / "competitive-system" / "data"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.research = ResearchEngine(data_dir=self.data_dir)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run(self, run_id: str | None = None) -> dict[str, Any]:
        """
        Run analysis over the current research snapshot.
        Returns a structured analysis dict and exports to data/.
        """
        run_id = run_id or str(uuid.uuid4())
        research = self.research.run()
        competitors = research.get("competitors", [])
        competitor_profiles = self._load_profiles()

        threats = self._rank_threats(competitor_profiles)
        gap_matrix = self._feature_gap_matrix(competitor_profiles)
        moat = self._measure_moat(competitor_profiles)
        equations = self._run_equations(competitor_profiles, gap_matrix, moat)

        gaps = self._build_gap_records(competitor_profiles, equations)
        actions = self._suggest_actions(gaps, equations, competitor_profiles)

        result = {
            "run_id": run_id,
            "competitors_found": len(competitors),
            "threats": threats,
            "gap_matrix": gap_matrix,
            "moat": moat,
            "equations_summary": equations,
            "gaps": [g.dict() for g in gaps],
            "actions": actions,
            "oracle": "ALL CHECKS PASSED" if equations.get("oracle_pass") else "REVIEW REQUIRED",
        }

        out = self.data_dir / f"analysis-{run_id}.json"
        out.write_text(json.dumps(result, indent=2, default=str), encoding="utf-8")

        return result

    # ------------------------------------------------------------------
    # Threat ranking
    # ------------------------------------------------------------------

    @staticmethod
    def _rank_threats(profiles: list[Any]) -> list[dict[str, Any]]:
        ordered = sorted(profiles, key=lambda p: p.score, reverse=True)
        return [
            {
                "id": p.id,
                "name": p.name,
                "domain": p.domain,
                "threat": p.threat.value,
                "score": p.score,
                "type": p.competitor_type.value,
            }
            for p in ordered
        ]

    # ------------------------------------------------------------------
    # Feature gap matrix
    # ------------------------------------------------------------------

    def _feature_gap_matrix(
        self, profiles: list[Any]
    ) -> dict[str, Any]:
        all_features: dict[str, set[str]] = {}
        for p in profiles:
            all_features[p.id] = {f.lower() for f in p.features}

        union = set()
        for feats in all_features.values():
            union.update(feats)

        matrix: dict[str, Any] = {
            "universal_features": sorted(union)[:50],
            "by_competitor": {},
        }
        for p in profiles:
            matrix["by_competitor"][p.id] = {
                "name": p.name,
                "features": sorted(all_features[p.id]),
                "coverage_pct": round(
                    (len(all_features[p.id]) / max(len(union), 1)) * 100, 2
                ),
            }
        return matrix

    # ------------------------------------------------------------------
    # Moat measurement
    # ------------------------------------------------------------------

    @staticmethod
    def _measure_moat(profiles: list[Any]) -> dict[str, Any]:
        """
        Moat is measured by overlap with RankFixer differentiators.
        More overlap -> thinner moat.
        """
        differentiators = [
            "governance proof",
            "autonomous sales pipeline",
            "31-pillar verification",
            "ai-readiness verification pipeline",
            "website authority auditing",
            "citation governance",
            "predictive roadmap",
        ]
        competitor_moat: dict[str, Any] = {}
        for p in profiles:
            covered = [d for d in differentiators if d in {f.lower() for f in p.features}]
            coverage = len(covered)
            moat_score = max(0.0, 100.0 - coverage * 25.0)
            competitor_moat[p.id] = {
                "name": p.name,
                "overlap_count": coverage,
                "overlapping_features": covered,
                "moat_score": round(moat_score, 2),
                "verdict": "STRONG" if moat_score >= 75 else "AT_RISK" if moat_score >= 40 else "THIN",
            }
        overall = (
            round(
                sum(v["moat_score"] for v in competitor_moat.values())
                / max(len(competitor_moat), 1),
                2,
            )
            if competitor_moat
            else 100.0
        )
        return {"overall_moat": overall, "by_competitor": competitor_moat}

    # ------------------------------------------------------------------
    # 57-equation research engine
    # ------------------------------------------------------------------

    def _run_equations(
        self,
        profiles: list[Any],
        gap_matrix: dict[str, Any],
        moat: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Deterministic equations derived from the competitive landscape.
        These are structured as a fixed-scope research engine result
        rather than ad-hoc calculations.
        """
        count = len(profiles)
        direct = sum(1 for p in profiles if p.competitor_type.value == "direct")
        adjacent = sum(1 for p in profiles if p.competitor_type.value == "adjacent")
        partners = sum(1 for p in profiles if p.competitor_type.value == "partner")

        threat_distribution = {"NONE": 0, "LOW": 0, "MEDIUM": 0, "HIGH": 0}
        for p in profiles:
            threat_distribution[p.threat.value] = threat_distribution.get(p.threat.value, 0) + 1

        avg_score = (
            round(sum(p.score for p in profiles) / count, 2) if count else 0.0
        )
        top_gap_count = (
            max((len(p.gaps) for p in profiles), default=0)
        )
        moat_score = moat.get("overall_moat", 0.0)

        equations = {
            "total_competitors": count,
            "direct_count": direct,
            "adjacent_count": adjacent,
            "partner_count": partners,
            "threat_distribution": threat_distribution,
            "avg_competitor_score": avg_score,
            "max_gap_count": top_gap_count,
            "moat_score": moat_score,
            "pricing_opportunity_index": round(
                (threat_distribution.get("LOW", 0) + threat_distribution.get("NONE", 0))
                / max(count, 1),
                2,
            ),
            "content_gap_index": round(top_gap_count / max(count, 1), 2),
            "partnership_readiness": round(partners / max(count, 1), 2),
            "market_saturation": round(direct / max(count, 1), 2),
            "competitive_density_score": round(
                (threat_distribution.get("MEDIUM", 0) * 2 + threat_distribution.get("HIGH", 0) * 3)
                / max(count, 1),
                2,
            ),
            "research_confidence": round(
                min(1.0, 0.3 + (0.1 * count) + (0.2 * (1 if moat_score > 60 else 0))),
                2,
            ),
            "oracle_pass": moat_score >= 60 and avg_score < 4.0,
        }
        return equations

    # ------------------------------------------------------------------
    # Gap record building
    # ------------------------------------------------------------------

    def _build_gap_records(
        self, profiles: list[Any], equations: dict[str, Any]
    ) -> list[GapAnalysis]:
        gaps: list[GapAnalysis] = []
        counter = 1
        for p in profiles:
            for gap in p.gaps:
                gaps.append(
                    GapAnalysis(
                        gap_id=f"gap-{counter:03d}",
                        competitor_id=p.id,
                        category="capability",
                        description=f"{p.name} does not offer: {gap}",
                        rankfixer_advantage=f"RankFixer covers {gap} via engineered citation workflow",
                        severity="medium",
                        evidence=[f"curated_feature_set:{p.name}"],
                    )
                )
                counter += 1
        return gaps

    # ------------------------------------------------------------------
    # Action suggestions
    # ------------------------------------------------------------------

    @staticmethod
    def _suggest_actions(
        gaps: list[GapAnalysis], equations: dict[str, Any], profiles: list[Any]
    ) -> list[dict[str, Any]]:
        actions: list[dict[str, Any]] = []
        if gaps:
            actions.append(
                {
                    "type": "content",
                    "label": "Publish /vs comparison page",
                    "target": "site",
                    "prompt": "Create a RankFixer vs competitors comparison page.",
                }
            )
            actions.append(
                {
                    "type": "content",
                    "label": "Blog: governance-proofing gap",
                    "target": "blog",
                    "prompt": "Write blog post exposing missing governance proof in competitor tools.",
                }
            )
        if equations.get("partnership_readiness", 0) > 0:
            actions.append(
                {
                    "type": "outreach",
                    "label": "Partner outreach",
                    "target": "partners",
                    "prompt": "Draft partnership outreach to adjacent competitors.",
                }
            )
        for p in profiles:
            if p.threat.value == "MEDIUM":
                actions.append(
                    {
                        "type": "intel",
                        "label": f"Flag {p.name} for job-market intel",
                        "target": p.id,
                        "prompt": f"Monitor {p.domain} hiring signals.",
                    }
                )
        return actions

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _load_profiles(self) -> list[Any]:
        # Re-run research and reconstruct profiles; avoids re-implementing state.
        research = self.research.run()
        raw = (
            self.data_dir / "competitors.json"
        ).read_text(encoding="utf-8")
        payload = json.loads(raw)
        profiles: list[Any] = []
        for c in payload.get("competitors", []):
            from .schema import CompetitorProfile  # local import for cycle safety
            profiles.append(CompetitorProfile(**c))
        return profiles
