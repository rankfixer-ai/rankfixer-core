"""
RankFixer Core Analyzer — Python bridge to the Site Mapper v2 JS engine.

Calls the existing Node.js Site Mapper pipeline via subprocess and returns
structured results as Python dicts. Does NOT reimplement any analysis logic.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from .competitive import CompetitiveIntel


class AnalyzerError(Exception):
    """Raised when the analyzer encounters an error."""

    def __init__(self, message: str, kind: str = "unknown") -> None:
        super().__init__(message)
        self.kind = kind


class Analyzer:
    """
    Analyze a website for LLM-readiness using the Site Mapper v2 pipeline.

    Usage:
        from rankfixer_core import Analyzer, CompetitiveIntel

        # Without competitive intel:
        a = Analyzer()
        result = a.analyze("https://example.com")

        # With competitive comparison:
        intel = CompetitiveIntel()
        a = Analyzer(intel=intel)
        result = a.analyze("https://example.com")
        print(result["competitive_comparison"])
    """

    def __init__(
        self,
        node_bin: str | None = None,
        intel: CompetitiveIntel | None = None,
    ) -> None:
        """
        Args:
            node_bin: Path to the Node.js binary. Auto-detected if None.
            intel: Optional CompetitiveIntel instance for comparison data.
        """
        self._node_bin = node_bin or self._find_node()
        self._mapper_dir = self._find_mapper_dir()
        self._intel = intel

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def analyze(self, url: str) -> dict[str, Any]:
        """
        Run a full Site Mapper v2 audit on the given URL.

        Returns a dict with keys:
            meta, site, templates, globalContradictions,
            graphSummary, discovery

        Raises AnalyzerError if the pipeline fails.
        """
        if not url or not isinstance(url, str):
            raise AnalyzerError("URL must be a non-empty string", "invalid_input")

        # Validate and normalize URL
        if not (url.startswith("http://") or url.startswith("https://")):
            url = f"https://{url}"

        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            if not parsed.netloc or "." not in parsed.netloc:
                raise ValueError(f"Invalid hostname: {parsed.netloc}")
        except (ValueError, Exception) as exc:
            raise AnalyzerError(
                f"Invalid URL '{url}': {exc}", "invalid_input"
            ) from exc

        cli_path = self._mapper_dir / "run-audit-cli.js"

        if not cli_path.is_file():
            raise AnalyzerError(
                f"Site Mapper CLI not found at {cli_path}. "
                f"Ensure rankfixer-mapper/run-audit-cli.js exists.",
                "missing_mapper",
            )

        try:
            proc = subprocess.run(
                [self._node_bin, str(cli_path), url],
                capture_output=True,
                text=True,
                timeout=120,
                cwd=str(self._mapper_dir),
            )
        except subprocess.TimeoutExpired:
            raise AnalyzerError(
                f"Site Mapper timed out after 120s for {url}",
                "timeout",
            )
        except FileNotFoundError:
            raise AnalyzerError(
                f"Node.js not found at '{self._node_bin}'. "
                f"Install Node.js or pass node_bin='/path/to/node'.",
                "node_not_found",
            )

        if proc.returncode != 0:
            error_msg = proc.stderr.strip() or proc.stdout.strip() or "Unknown error"
            # Try to parse structured error from stderr
            try:
                err_data = json.loads(error_msg)
                error_msg = err_data.get("error", error_msg)
            except (json.JSONDecodeError, TypeError):
                pass
            raise AnalyzerError(
                f"Site Mapper failed for {url}: {error_msg}",
                "mapper_failed",
            )

        try:
            result = json.loads(proc.stdout)
        except json.JSONDecodeError as exc:
            raise AnalyzerError(
                f"Site Mapper returned invalid JSON: {exc}",
                "invalid_output",
            )

        # Inject competitive comparison if intel is available
        if self._intel is not None:
            try:
                result["competitive_comparison"] = self._intel.compare(result)
            except Exception:
                result["competitive_comparison"] = {
                    "available": False,
                    "message": "Competitive comparison failed — see logs.",
                }

        return result

    def batch_analyze(
        self, urls: list[str]
    ) -> dict[str, dict[str, Any]]:
        """
        Analyze multiple URLs. Returns {url: result} dict.
        Failed analyses are included as {"error": "...", "kind": "..."}.
        """
        results: dict[str, dict[str, Any]] = {}
        for url in urls:
            try:
                results[url] = self.analyze(url)
            except AnalyzerError as exc:
                results[url] = {"error": str(exc), "kind": exc.kind}
        return results

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _find_node() -> str:
        """Locate the Node.js binary, or raise."""
        node = shutil.which("node")
        if node:
            return node
        # Windows fallbacks
        for candidate in [
            r"C:\Program Files\nodejs\node.exe",
            r"C:\Program Files (x86)\nodejs\node.exe",
        ]:
            if os.path.isfile(candidate):
                return candidate
        raise AnalyzerError(
            "Node.js not found on PATH. Install Node.js or pass node_bin=...",
            "node_not_found",
        )

    @staticmethod
    def _find_mapper_dir() -> Path:
        """
        Locate the rankfixer-mapper directory relative to this source file.

        When installed editable (pip install -e .), __file__ points to the
        actual source location, so the relative path works.
        """
        this_file = Path(__file__).resolve()
        # this_file: .../rankfixer-core/src/rankfixer_core/analyzer.py
        # mapper_dir: .../rankfixer-core/rankfixer-mapper/
        repo_root = this_file.parent.parent.parent  # rankfixer_core/ -> src/ -> repo root
        mapper_dir = repo_root / "rankfixer-mapper"
        return mapper_dir
