"""
RankFixer Core — Open-source AI Website Recommendation Engine for GEO.

Analyzes website architecture, schema markup, and content structure
to generate actionable recommendations for improving visibility in
Large Language Models (ChatGPT, Perplexity, Gemini, Claude) and AI Overviews.
"""

__version__ = "1.0.0"
__author__ = "RankFixer"
__license__ = "MIT"

from .analyzer import Analyzer, AnalyzerError
from .competitive import CompetitiveIntel

__all__ = ["Analyzer", "AnalyzerError", "CompetitiveIntel"]
