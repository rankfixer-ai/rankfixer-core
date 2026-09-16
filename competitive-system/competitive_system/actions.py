"""
actions.py — Phase 2: act on findings.

Generates concrete artifacts from gap analysis:
- /vs comparison page markdown
- blog post drafts
- partner outreach templates
- job-intel flags
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from .schema import ActionRecord, GapAnalysis
from .analysis import AnalysisEngine


class ActionEngine:
    """
    Takes analysis output and produces action artifacts.
    All artifacts are written under competitive-system/output/.
    """

    def __init__(self, data_dir: Path | None = None, output_dir: Path | None = None) -> None:
        repo_root = Path(__file__).resolve().parent.parent.parent
        self.data_dir = data_dir or repo_root / "competitive-system" / "data"
        self.output_dir = output_dir or repo_root / "competitive-system" / "output"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run(self, analysis: dict[str, Any] | None = None) -> dict[str, Any]:
        """
        Execute all suggested actions and write artifacts.
        Returns a summary dict with action records.
        """
        if analysis is None:
            analysis = AnalysisEngine(data_dir=self.data_dir).run()

        actions: list[ActionRecord] = []
        for suggestion in analysis.get("actions", []):
            action_type = str(suggestion.get("type", "")).lower()
            if action_type == "content":
                records = self._generate_content(suggestion, analysis)
                actions.extend(records)
            elif action_type == "outreach":
                records = self._generate_outreach(suggestion, analysis)
                actions.extend(records)
            elif action_type == "intel":
                records = self._generate_intel_flag(suggestion, analysis)
                actions.extend(records)

        summary = {
            "actions_run": len(actions),
            "actions": [a.dict() for a in actions],
            "output_dir": str(self.output_dir),
        }
        path = self.data_dir / "actions.json"
        path.write_text(json.dumps(summary, indent=2, default=str), encoding="utf-8")
        return summary

    # ------------------------------------------------------------------
    # Content generation
    # ------------------------------------------------------------------

    def _generate_content(
        self, suggestion: dict[str, Any], analysis: dict[str, Any]
    ) -> list[ActionRecord]:
        records: list[ActionRecord] = []
        label = str(suggestion.get("label", ""))
        prompt = str(suggestion.get("prompt", ""))
        competitors = analysis.get("threats", [])

        if label.startswith("Publish") or "/vs" in label:
            record = self._create_record(
                action_type="vs_page",
                competitor_id=None,
                payload={
                    "title": "RankFixer vs Competitors",
                    "body": self._render_vs_markdown(competitors),
                    "target_path": "site/vs/index.html",
                },
            )
            self._write_output("vs-page.md", record.payload["body"])
            records.append(record)

        if "Blog:" in label:
            gaps = analysis.get("gaps", [])
            record = self._create_record(
                action_type="blog_post",
                competitor_id=None,
                payload={
                    "title": "Why your SEO tool can't prove it worked",
                    "body": self._render_blog_markdown(gaps),
                    "target_path": "blog/why-your-seo-tool-cant-prove-it-worked.md",
                },
            )
            self._write_output("blog-post.md", record.payload["body"])
            records.append(record)

        return records

    # ------------------------------------------------------------------
    # Outreach generation
    # ------------------------------------------------------------------

    def _generate_outreach(
        self, suggestion: dict[str, Any], analysis: dict[str, Any]
    ) -> list[ActionRecord]:
        text = (
            "Hi there,\n\n"
            "We noticed your platform is focused on SEO. "
            "We're building RankFixer, an autonomous citation-governance layer "
            "for GEO and AI visibility. It could complement what you already do.\n\n"
            "Open to a brief chat?\n\n"
            "— RankFixer"
        )
        record = self._create_record(
            action_type="outreach",
            competitor_id=None,
            payload={
                "subject": "Potential partnership: RankFixer + your platform",
                "body": text,
                "targets": [
                    c.get("domain")
                    for c in analysis.get("threats", [])
                    if c.get("threat") in ("MEDIUM", "LOW")
                ][:5],
            },
        )
        self._write_output("outreach-template.txt", text)
        return [record]

    # ------------------------------------------------------------------
    # Intel flags
    # ------------------------------------------------------------------

    def _generate_intel_flag(
        self, suggestion: dict[str, Any], analysis: dict[str, Any]
    ) -> list[ActionRecord]:
        record = self._create_record(
            action_type="job_intel_flag",
            competitor_id=suggestion.get("target"),
            payload={
                "label": suggestion.get("label"),
                "prompt": suggestion.get("prompt"),
                "status": "flagged",
            },
        )
        return [record]

    # ------------------------------------------------------------------
    # Renderers
    # ------------------------------------------------------------------

    def _render_vs_markdown(self, competitors: list[dict[str, Any]]) -> str:
        lines = [
            "# RankFixer vs Competitors",
            "",
            "This page is auto-generated by the RankFixer competitive system.",
            "",
            "| Competitor | Type | Threat | Score |",
            "| --- | --- | --- | --- |",
        ]
        for c in competitors:
            lines.append(
                f"| {c.get('name')} | {c.get('type')} | {c.get('threat')} | {c.get('score')} |"
            )
        lines += [
            "",
            "## RankFixer Differentiators",
            "",
            "- Governance proof",
            "- Autonomous sales pipeline",
            "- 31-pillar verification",
            "- Citation governance",
            "",
            f"_Generated at {datetime.now(timezone.utc).isoformat()}_",
        ]
        return "\n".join(lines) + "\n"

    def _render_blog_markdown(self, gaps: list[dict[str, Any]]) -> str:
        lines = [
            "---",
            "title: Why your SEO tool can't prove it worked",
            "date: " + datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "tags: [geo, seo, ai-visibility]",
            "---",
            "",
            "# Why your SEO tool can't prove it worked",
            "",
            "Most SEO platforms stop at rankings. That's not proof of AI visibility.",
            "",
            "## The proof gap",
            "",
        ]
        if gaps:
            for g in gaps[:8]:
                lines.append(f"- {g.get('description')}")
        else:
            lines.append("- No competitor gaps found in this run.")
        lines += [
            "",
            "## What RankFixer does differently",
            "",
            "- 31-pillar verification",
            "- Governance proof",
            "- Autonomous sales pipeline",
            "",
            "_Auto-generated from competitive analysis._",
        ]
        return "\n".join(lines) + "\n"

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _create_record(
        self,
        action_type: str,
        competitor_id: str | None,
        payload: dict[str, Any],
    ) -> ActionRecord:
        return ActionRecord(
            action_id=str(uuid.uuid4()),
            action_type=action_type,
            competitor_id=competitor_id,
            payload=payload,
            status="completed",
            outcome="artifact_written",
            completed_at=datetime.now(timezone.utc),
        )

    def _write_output(self, filename: str, content: str) -> None:
        target = self.output_dir / filename
        target.write_text(content, encoding="utf-8")
