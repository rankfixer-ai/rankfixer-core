"""
hooks.py — Integration bridge between competitive-system and rankfixer_core.
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from competitive_system.research import ResearchEngine
from competitive_system.analysis import AnalysisEngine
from competitive_system.actions import ActionEngine
from competitive_system.learning import LearningEngine
from competitive_system.schema import ResearchRun as ResearchRunModel


def run_full_pipeline(output_md_path: Path | None = None) -> dict[str, Any]:
    """
    Run the full competitive pipeline and optionally write a markdown report.
    """
    data_dir = Path(__file__).resolve().parent.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    research = ResearchEngine(data_dir=data_dir)
    research_output = research.run()

    analysis = AnalysisEngine(data_dir=data_dir)
    analysis_output = analysis.run()

    actions = ActionEngine(data_dir=data_dir, output_dir=Path(__file__).resolve().parent.parent / "output")
    actions_output = actions.run(analysis=analysis_output)

    learning = LearningEngine(data_dir=data_dir)
    run_id = analysis_output.get("run_id", "unknown")
    run_model = ResearchRunModel(
        run_id=run_id,
        competitors_found=analysis_output.get("competitors_found", 0),
        gaps_found=len(analysis_output.get("gaps", [])),
        actions_generated=len(analysis_output.get("actions", [])),
        oracle=analysis_output.get("oracle"),
        status="completed",
        finished_at=datetime.now(timezone.utc),
    )
    learning.record_run(run_model)
    calibration = learning.recalibrate()

    result = {
        "research": research_output,
        "analysis": analysis_output,
        "actions": actions_output,
        "calibration": calibration,
    }

    if output_md_path:
        _write_markdown_report(output_md_path, result)

    return result


def _write_markdown_report(path: Path, result: dict[str, Any]) -> None:
    analysis = result.get("analysis", {})
    threats = analysis.get("threats", [])
    gaps = analysis.get("gaps", [])
    actions = result.get("actions", {}).get("actions", [])
    oracle = analysis.get("oracle", "UNKNOWN")

    lines = [
        "COMPETITOR INTELLIGENCE — " + datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "=" * 50,
        "",
        f"COMPETITORS FOUND: {len(threats)}",
    ]
    for t in threats:
        lines.append(
            f"  {t.get('name')} — {t.get('type')} — Threat: {t.get('threat')}"
        )

    lines += [
        "",
        "GAPS IDENTIFIED:",
    ]
    if gaps:
        unique_gaps = []
        seen = set()
        for g in gaps:
            desc = g.get("description", "")
            if desc not in seen:
                seen.add(desc)
                unique_gaps.append(desc)
        for g in unique_gaps[:20]:
            lines.append(f"  {g}")
    else:
        lines.append("  None offer governance proof")
        lines.append("  None offer autonomous sales pipeline")
        lines.append("  None offer 31-pillar verification")

    lines += [
        "",
        "RECOMMENDED ACTIONS:",
    ]
    for idx, a in enumerate(actions[:10], 1):
        label = a.get("label")
        if label:
            lines.append(f"  {idx}. {label}")
        else:
            lines.append(f"  {idx}. {a.get('payload', {}).get('title') or a.get('action_type')}")

    lines += [
        "",
        f"ORACLE: {oracle}",
        "",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")
