"""competitive-system CLI."""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

from competitive_system.schema import ResearchRun
from competitive_system.research import ResearchEngine
from competitive_system.analysis import AnalysisEngine
from competitive_system.actions import ActionEngine
from competitive_system.learning import LearningEngine


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="competitive-system",
        description="RankFixer competitive intelligence pipeline",
    )
    parser.add_argument(
        "--run",
        action="store_true",
        help="Run the full research -> analyze -> act -> learn pipeline",
    )
    parser.add_argument(
        "--output",
        default="researchdata.md",
        help="Markdown report output path (default: researchdata.md)",
    )
    parser.add_argument(
        "--data-dir",
        default=None,
        help="Override data directory path",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    repo_root = Path(__file__).resolve().parent
    data_dir = Path(args.data_dir) if args.data_dir else repo_root / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    output_path = Path(args.output)

    if args.run:
        _run_pipeline(data_dir=data_dir, output_path=output_path)
        return 0

    print("Nothing to do. Use --run to execute the pipeline.", file=sys.stderr)
    return 1


def _run_pipeline(data_dir: Path, output_path: Path) -> None:
    research = ResearchEngine(data_dir=data_dir)
    research_output = research.run()

    analysis = AnalysisEngine(data_dir=data_dir)
    analysis_output = analysis.run()

    actions = ActionEngine(data_dir=data_dir, output_dir=Path(__file__).resolve().parent.parent / "output")
    actions_output = actions.run(analysis=analysis_output)

    learning = LearningEngine(data_dir=data_dir)
    run_id = analysis_output.get("run_id", "unknown")
    run_model = ResearchRun(
        run_id=run_id,
        competitors_found=analysis_output.get("competitors_found", 0),
        gaps_found=len(analysis_output.get("gaps", [])),
        actions_generated=len(analysis_output.get("actions", [])),
        oracle=analysis_output.get("oracle"),
        status="completed",
        finished_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
    )
    learning.record_run(run_model)
    calibration = learning.recalibrate()

    _write_markdown_report(output_path, {
        "research": research_output,
        "analysis": analysis_output,
        "actions": actions_output,
        "calibration": calibration,
    })


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


if __name__ == "__main__":
    raise SystemExit(main())
