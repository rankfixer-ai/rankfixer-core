# Citation Verification Report

**Source:** `governed-ai-execution-9-piece-cluster.md`
**Audit date:** 2026-09-23
**Resolver:** `tools/resolve_citations.py`
**Fail-closed rule:** Missing artifact → UNRESOLVED, never silent pass.

---

## Inventory Summary

| Class | Profile | Count | Date range |
|-------|---------|-------|------------|
| session | jan | 11 | Aug 30 – Sep 9, 2026 |
| session | governance | 27 | Aug 19 – Aug 25, 2026 |
| session | ite-kernel | 25 | Aug 5 – Aug 12, 2026 |
| spawn | jan | 4 trees | Sep 15 – Sep 22, 2026 |
| delegation | jan | 11 summaries | Sep 6 – Sep 21, 2026 |
| receipt | governance | 8 | Sep 6 – Sep 20, 2026 |
| backup | jan | 3 | Sep 15 – Sep 20, 2026 |
| backup | governance | 7 | Sep 15 – Sep 20, 2026 |
| backup | ite-kernel | 3 | Sep 15 – Sep 20, 2026 |

**Key gap:** No session dumps exist for Sept 11, 15, 16, or 21 — the four dates the draft cites. Sessions end at Sept 9. Adjacent metadata artifacts (spawn trees, delegation summaries, receipts, backups) exist for Sept 15 and 21, but not Sept 11 or 16.

---

## Resolution Summary

| Status | Count |
|--------|-------|
| RESOLVED | 0 |
| UNRESOLVED | 28 |
| CONTRADICTED | 0 |
| CATEGORY-MISMATCH | 28 |

**All 28 session-class citations resolve to UNRESOLVED.** No session dump exists for any cited ID. All 28 claims are also CATEGORY-MISMATCH because they describe conversations ("discussed," "decided," "found," "named," "added") which require SESSION-class evidence, but the only available artifacts are SPAWN, DELEGATION, RECEIPT, or BACKUP — none of which contain conversation transcripts.

---

## Per-Claim Audit

| Claim ID | Original Citation | Claim (excerpt) | Required Class | Available Artifact | Resolution | Proposed Citation |
|----------|-------------------|-----------------|----------------|--------------------|------------|-------------------|
| P1M1 | `jan/20260911_093342_80910f` | ToolFoundry Finding 1: 32 tools stamped "auto" | SESSION | None for Sept 11 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED — no artifact supports this claim |
| P1M2 | `jan/20260911_093342_80910f` | Finding 2: rejected candidates left no trace | SESSION | None for Sept 11 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |
| P1M3 | `jan/20260921_211740_38b6ea` | Idea-to-Execution ran 43 days zero output | SESSION | SPAWN, DELEGATION for Sept 21 | UNRESOLVED + CATEGORY-MISMATCH | `@spawn:jan/97d127ae/20260921T144049.json` — but this is a spawn tree, not a conversation |
| P2M1 | `jan/20260915_222717_d5e597` | Hermes rm -rf incident | SESSION | SPAWN, BACKUP for Sept 15 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED — no transcript describes the incident |
| P2M2 | `jan/20260915_222717_d5e597` | "Untracked files are not protected by git" added to memory | SESSION | SPAWN for Sept 15 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |
| P2M3 | `jan/20260915_222717_d5e597` | EOS audit: engine.py and index.html missing | SESSION | None for Sept 15 describing audit | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |
| P3M1 | `jan/20260915_222717_d5e597` | Article 0 Sanity Gate convention named | SESSION | None for Sept 15 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |
| P3M2 | `jan/20260911_093342_80910f` | Finding 1 fix: provenance_for_auto reads import_check | SESSION | None for Sept 11 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |
| P3M3 | `jan/20260911_093342_80910f` | Finding 2 fix: _log_candidate_rejected added | SESSION | None for Sept 11 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |
| P3M4 | `jan/20260911_093342_80910f` | Ledger verification: 9 new events, hash chain valid | SESSION | None for Sept 11 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |
| P4M1 | `jan/20260921_211740_38b6ea` | FastPlay Scanner: 58 patterns, 7 categories, 8 workers | SESSION | SPAWN, DELEGATION for Sept 21 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED — specs not in any transcript |
| P4M2 | `jan/20260916_085922_4d023b` | verify_claims.py — 7 primitives | SESSION | None for Sept 16 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |
| P4M3 | `jan/20260916_085922_4d023b` | "Simulate" pattern confirmed absent | SESSION | None for Sept 16 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |
| P4M4 | `jan/20260921_211740_38b6ea` | AOP v3: 11 rule-based decision tiers | SESSION | SPAWN for Sept 21 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |
| P5M1 | `jan/20260915_222717_d5e597` | Article 0 named and added to memory | SESSION | None for Sept 15 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |
| P5M2 | `jan/20260921_211740_38b6ea` | Idea-to-Execution pipeline killed | SESSION | SPAWN for Sept 21 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED — decision not in transcript |
| P5M3 | `jan/20260916_085922_4d023b` | verify_citation added to verify_claims.py | SESSION | None for Sept 16 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |
| P6M1 | `jan/20260916_085922_4d023b` | verify_citation added — checks source existence | SESSION | None for Sept 16 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |
| P6M2 | `jan/20260916_085922_4d023b` | Adapter problem: blog sources vs scanner issues | SESSION | None for Sept 16 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |
| P6M3 | `jan/20260916_085922_4d023b` | Published posts passed mechanical verification | SESSION | None for Sept 16 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |
| P6M4 | `jan/20260916_085922_4d023b` | Blog pipeline skill created | SESSION | None for Sept 16 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |
| P7M1 | `jan/20260921_211740_38b6ea` | PMOS defined | SESSION | SPAWN for Sept 21 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |
| P7M2 | `jan/20260921_211740_38b6ea` | "No authority → no execution" core rule | SESSION | SPAWN for Sept 21 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |
| P7M3 | `jan/20260915_222717_d5e597` | PMOS Phases 6-8 deferred | SESSION | None for Sept 15 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |
| P8M1 | `jan/20260911_093342_80910f` | ToolFoundry audit: 4 findings, 2 resolved | SESSION | None for Sept 11 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |
| P8M2 | `jan/20260911_093342_80910f` | Verification distinction: independently verified vs reported | SESSION | None for Sept 11 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |
| P8M3 | `jan/20260916_085922_4d023b` | verify_claims.py self-test: 7 primitives present | SESSION | None for Sept 16 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |
| P8M4 | `jan/20260921_211740_38b6ea` | Master architecture diagram: 29 projects, 172K files | SESSION | SPAWN for Sept 21 | UNRESOLVED + CATEGORY-MISMATCH | UNANCHORED |

---

## UNANCHORED Claims — Proposed Rewrite or Removal

All 28 claims are UNANCHORED. Two paths:

### Path A: Rewrite as author-synthesis (remove citations, describe patterns qualitatively)

| Claim ID | Original claim | Rewrite |
|----------|----------------|---------|
| P1M1 | ToolFoundry Finding 1: 32 tools stamped "auto" | "In governed agent systems, approval gates often exist in documentation but not in code — the field is computed but never read before stamping the record 'approved.'" |
| P1M2 | Finding 2: rejected candidates left no trace | "Silent rejection — where the system refuses an action but logs nothing — is a common failure mode in governance pipelines that only record acceptances." |
| P1M3 | Idea-to-Execution ran 43 days zero output | "Long-running pipelines can produce silent failures: operational systems that report green while producing nothing, because the failure detection path is itself broken." |
| P2M1 | Hermes rm -rf incident | "A command-line deletion event can destroy project state, and recovery without append-only ledgers requires reconstructing intent from scattered artifacts." |
| P3M2 | Finding 1 fix | "Fixing such a gate often requires a single function change — reading the computed validation result before acting on it — rather than adding a new layer." |

### Path B: Remove entirely

Claims that describe specific events with no artifact path at all (Sept 11 sessions) and no qualitative substitute:
- P2M2, P2M3, P3M1, P3M3, P3M4, P4M2, P4M3, P5M1, P5M3, P6M1-M4, P7M3, P8M1-M3

These describe specific conversations that never happened. They cannot be rewritten as patterns — they are specific event claims. Remove.

---

## Category Mismatch Details

The draft's claims describe conversations, decisions, and findings — all require SESSION-class evidence. The only artifacts available for the cited dates are:

- **SPAWN trees** — metadata about dispatched work, not the work itself. Can support "research was dispatched" claims but not "we discussed X" or "finding Y was identified."
- **DELEGATION summaries** — subagent output summaries. Can support "a subagent produced findings on X" but not specific decision details.
- **RECEIPTS / BACKUPS** — system state records. Low evidentiary weight for work claims.

**No SPAWN or DELEGATION artifact supports any specific claim in the draft.** The spawn trees for Sept 15 and 21 contain:
- `e8cd1bf3`: "Write a 1,200-2,000 word blog draft on 'Citation Divergence'" — a delegation dispatched, not a conversation
- `fe353311`: "Execute Option A: dead-code cleanup for RankFixer" — another delegation
- `97d127ae`: "Research PHILIPPINES POWER INFRASTRUCTURE" — unrelated to governance

None of these contain ToolFoundry audits, Article 0 naming, PMOS definitions, or verify_claims development. The category mismatch is total.

---

## Recommended Action

**The cluster cannot be published with its current claims.** Two options:

1. **Strip all session citations and rewrite as author-synthesis.** The nine-piece structure and its arguments may still be valid, but every claim that currently cites a non-existent session must be either:
   - Removed (if it describes a specific event), or
   - Rewritten as a qualitative pattern statement with no citation.

2. **Revise the evidence base.** Use only the sessions and artifacts that actually exist on disk:
   - `ite-kernel` sessions (Aug 5-12): governance kernel development, pre-commit hooks, ceremony design
   - `governance` sessions (Aug 19-25): PMOS design, authority separation, Article 0 as a runtime concept
   - `jan` sessions (Aug 30 - Sep 9): FastPlay Foundation skill, verify_claims integration, blog pipeline development
   - `jan` spawn trees (Sep 15-22): delegation dispatches (but not conversations)

This would require re-scoping the cluster to cover only what the evidence actually shows — which is still substantial, but different from what the current draft claims.

---

## Resolver Script

The resolver is at: `tools/resolve_citations.py`

Usage:
```
python tools\resolve_citations.py --inventory
python tools\resolve_citations.py <markdown_file>
```

It will emit RESOLVED / UNRESOLVED / CONTRADICTED per citation.
