"""Data models / schemas for the competitive system."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ThreatLevel(str, Enum):
    none = "NONE"
    low = "LOW"
    medium = "MEDIUM"
    high = "HIGH"


class CompetitorType(str, Enum):
    direct = "direct"
    adjacent = "adjacent"
    partner = "partner"


class CompetitorProfile(BaseModel):
    id: str
    name: str
    domain: str
    competitor_type: CompetitorType
    threat: ThreatLevel
    pricing: list[dict[str, Any]] = Field(default_factory=list)
    features: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    score: float = 0.0
    raw: dict[str, Any] = Field(default_factory=dict)
    discovered_at: datetime = Field(default_factory=datetime.utcnow)


class GapAnalysis(BaseModel):
    gap_id: str
    competitor_id: str
    category: str
    description: str
    rankfixer_advantage: str
    severity: str
    evidence: list[str] = Field(default_factory=list)


class ActionRecord(BaseModel):
    action_id: str
    action_type: str
    competitor_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    status: str = "queued"
    outcome: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: datetime | None = None


class LearningSignal(BaseModel):
    signal_id: str
    action_id: str
    metric: str
    value: Any
    notes: str | None = None
    recorded_at: datetime = Field(default_factory=datetime.utcnow)


class ResearchRun(BaseModel):
    run_id: str
    started_at: datetime = Field(default_factory=datetime.utcnow)
    finished_at: datetime | None = None
    competitors_found: int = 0
    gaps_found: int = 0
    actions_generated: int = 0
    oracle: str | None = None
    status: str = "running"
