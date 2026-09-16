"""
learning.py — Phase 3: track outcomes and recalibrate.

Provides a lightweight ledger with SQLite persistence and a
deterministic recalibration pass that adjusts scores for the
next competitive cycle.
"""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from .schema import LearningSignal, ResearchRun


class LearningEngine:
    """
    Records outcomes from actions and recalibrates research artifacts.
    """

    def __init__(self, data_dir: Path | None = None) -> None:
        repo_root = Path(__file__).resolve().parent.parent.parent
        self.data_dir = data_dir or repo_root / "competitive-system" / "data"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = self.data_dir / "ledger.sqlite"
        self._init_db()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def record_signal(self, signal: LearningSignal) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT INTO learning_signals
                (signal_id, action_id, metric, value, notes, recorded_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    signal.signal_id,
                    signal.action_id,
                    signal.metric,
                    json.dumps(signal.value, default=str),
                    signal.notes,
                    signal.recorded_at.isoformat(),
                ),
            )
            conn.commit()

    def record_run(self, run: ResearchRun) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT INTO research_runs
                (run_id, started_at, finished_at, competitors_found,
                 gaps_found, actions_generated, oracle, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run.run_id,
                    run.started_at.isoformat(),
                    run.finished_at.isoformat() if run.finished_at else None,
                    run.competitors_found,
                    run.gaps_found,
                    run.actions_generated,
                    run.oracle,
                    run.status,
                ),
            )
            conn.commit()

    def finish_run(self, run_id: str) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "UPDATE research_runs SET finished_at = ?, status = 'completed' WHERE run_id = ?",
                (datetime.now(timezone.utc).isoformat(), run_id),
            )
            conn.commit()

    def recalibrate(self) -> dict[str, Any]:
        """
        Recalibrate next cycle by inspecting historical run outcomes.
        Returns calibration metadata and writes recalibration.json.
        """
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            runs = conn.execute("SELECT * FROM research_runs ORDER BY started_at ASC").fetchall()
            signals = conn.execute(
                "SELECT * FROM learning_signals ORDER BY recorded_at ASC"
            ).fetchall()

        run_count = len(runs)
        signal_count = len(signals)

        # Basic recalibration: adjust oracle threshold by observed pass rate.
        oracle_passes = sum(1 for r in runs if r["oracle"] == "ALL CHECKS PASSED")
        pass_rate = oracle_passes / max(run_count, 1)

        calibration = {
            "recalibrated_at": datetime.now(timezone.utc).isoformat(),
            "run_count": run_count,
            "signal_count": signal_count,
            "oracle_pass_rate": round(pass_rate, 4),
            "oracle_threshold": round(max(0.5, min(0.9, pass_rate)), 2),
            "next_cycle_adjustments": {
                "increase_depth_if": "pass_rate < 0.7",
                "reduce_noise_if": "signal_count > run_count * 20",
            },
        }
        path = self.data_dir / "recalibration.json"
        path.write_text(json.dumps(calibration, indent=2), encoding="utf-8")
        return calibration

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _init_db(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS research_runs (
                    run_id TEXT PRIMARY KEY,
                    started_at TEXT,
                    finished_at TEXT,
                    competitors_found INTEGER,
                    gaps_found INTEGER,
                    actions_generated INTEGER,
                    oracle TEXT,
                    status TEXT
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS learning_signals (
                    signal_id TEXT PRIMARY KEY,
                    action_id TEXT,
                    metric TEXT,
                    value TEXT,
                    notes TEXT,
                    recorded_at TEXT
                )
                """
            )
            conn.commit()
