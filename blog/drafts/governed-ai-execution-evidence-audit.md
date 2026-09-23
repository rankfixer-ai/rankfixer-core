# Evidence Audit — Governed AI Execution 9-Piece Cluster

**Target file:** `D:\workspace\projects\sales-pipeline\rankfixer-core\blog\drafts\governed-ai-execution-9-piece-cluster.md`

**Ground truth:** Session dump inventory across all profiles ends at 2026-09-09. Adjacent metadata artifacts exist for 2026-09-15 and 2026-09-21 only. No artifacts exist for 2026-09-11 or 2026-09-16.

---

## OUTPUT 1 — Citation Audit

| Cluster location | Claim (exact wording) | Cited session | Resolves to | Status |
|------------------|-----------------------|---------------|-------------|--------|
| Piece 1, row 1 | "ToolFoundry Finding 1: 32 tools all stamped \"auto\" / approved — 4 of them couldn't even import. The approval field carried zero information. It wasn't a gate with a logic bug; it wasn't a gate at all." | `jan/20260911_093342_80910f` | No session dump for Sept 11. No adjacent artifacts for this date. | **UNVERIFIED** |
| Piece 1, row 2 | "ToolFoundry Finding 2: rejected candidates left no ledger trace. `print()` + `return` — silent rejection with no audit event." | `jan/20260911_093342_80910f` | No session dump for Sept 11. No adjacent artifacts for this date. | **UNVERIFIED** |
| Piece 1, row 3 | "Idea-to-Execution R&D pipeline ran for 43 days with zero real output (DeepSeek credits expired Aug 10) while sending \"all green\" status emails." | `jan/20260921_211740_38b6ea` | Adjacent artifacts: `jan/spawn-trees/97d127ae/20260921T144049.json`, `jan/spawn-trees/97d127ae/20260921T165644.json`, `jan/cache/delegation/subagent-summary-*-20260921_225604_*.txt`. No transcript. | **METADATA-ONLY** |
| Piece 2, row 1 | "Hermes `rm -rf` incident: ToolFoundry recovered from backup; memory entries note \"recovering from Hermes rm -rf incident.\"" | `jan/20260915_222717_d5e597` | Adjacent artifacts: `jan/backups/config/config.yaml.good.20260915-215846`, `jan/backups/config/config.yaml.good.20260915-024421`, `jan/spawn-trees/e8cd1bf3/20260915T234700.json`, `jan/spawn-trees/fe353311/20260915T230022.json`. No transcript. | **METADATA-ONLY** |
| Piece 2, row 2 | "\"Untracked files are not protected by git. Any file a cron job depends on must be tracked.\" — added to memory after losing `test-v2.js`" | `jan/20260915_222717_d5e597` | Same as above. Memory entry, not transcript. | **METADATA-ONLY** |
| Piece 2, row 3 | "EOS audit: `engine.py` and dashboard `index.html` confirmed missing — components that existed only in memory, not on disk" | `jan/20260915_222717_d5e597` | Same as above. | **METADATA-ONLY** |
| Piece 3, row 1 | "Article 0 Sanity Gate convention: don't do rewrites whose current cost is zero; verify before declaring done" | `jan/20260915_222717_d5e597` | Adjacent artifacts exist for Sept 15 (config backups, spawn trees). No transcript. | **METADATA-ONLY** |
| Piece 3, row 2 | "Finding 1 fix: `provenance_for_auto()` now reads `import_check`; failed imports → `auto_rejected`" | `jan/20260911_093342_80910f` | No session dump for Sept 11. No adjacent artifacts. | **UNVERIFIED** |
| Piece 3, row 3 | "Finding 2 fix: `_log_candidate_rejected()` helper — 3 reject stages now emit `CANDIDATE_REJECTED` events" | `jan/20260911_093342_80910f` | No session dump for Sept 11. No adjacent artifacts. | **UNVERIFIED** |
| Piece 3, row 4 | "Ledger verification: 9 new events appended, all with valid hash chain links; regression checks confirm zero false positives" | `jan/20260911_093342_80910f` | No session dump for Sept 11. No adjacent artifacts. | **UNVERIFIED** |
| Piece 4, row 1 | "FastPlay Scanner: 58 patterns, 7 categories, 8 parallel workers, ~732ms per 50 files" | `jan/20260921_211740_38b6ea` | Adjacent artifacts: `jan/spawn-trees/97d127ae/20260921T144049.json`, `jan/spawn-trees/97d127ae/20260921T165644.json`, `jan/cache/delegation/subagent-summary-*-20260921_225604_*.txt`. No transcript. | **METADATA-ONLY** |
| Piece 4, row 2 | "`verify_claims.py` — 7 verification primitives: `detect_self_grading`, `detect_definition_after_fact`, `resum_from_raw_data`, `scope_constant_between_runs`, `verify_behavioral`, `verify_categorical`, `verify_procedural`" | `jan/20260916_085922_4d023b` | No session dump for Sept 16. No adjacent artifacts for this date. | **UNVERIFIED** |
| Piece 4, row 3 | "\"Simulate\" pattern confirmed absent from `verify_claims.py` — the dangerous pattern from the weak version" | `jan/20260916_085922_4d023b` | No session dump for Sept 16. No adjacent artifacts. | **UNVERIFIED** |
| Piece 4, row 4 | "AOP v3: 11 rule-based decision tiers (No Evidence → Zero Failures → Critical Fail → All Precautions → Minor → High Smell Density → Significant → Widespread → Test Coverage → Doc Coverage → Complexity)" | `jan/20260921_211740_38b6ea` | Adjacent artifacts exist for Sept 21. No transcript. | **METADATA-ONLY** |
| Piece 5, row 1 | "Article 0 named and added to memory: \"don't do rewrites whose current cost is zero; don't declare things retired/done before verifying\"" | `jan/20260915_222717_d5e597` | Adjacent artifacts exist for Sept 15. No transcript. | **METADATA-ONLY** |
| Piece 5, row 2 | "Applied in practice: Idea-to-Execution pipeline killed (not fixed) because 43 days of silent failure + stale codebase = zero-cost rewrite was the right call" | `jan/20260921_211740_38b6ea` | Adjacent artifacts exist for Sept 21. No transcript. | **METADATA-ONLY** |
| Piece 5, row 3 | "Applied in practice: `verify_claims.py` extended with `citation` claim type instead of forcing a bad mapping through the numeric verifier" | `jan/20260916_085922_4d023b` | No session dump for Sept 16. No adjacent artifacts. | **UNVERIFIED** |
| Piece 6, row 1 | "`verify_citation` added to `verify_claims.py` — checks source existence, value presence, attribution consistency" | `jan/20260916_085922_4d023b` | No session dump for Sept 16. No adjacent artifacts. | **UNVERIFIED** |
| Piece 6, row 2 | "The adapter problem: blog sources are `{exact_quote, number, context}` — not scanner `issues` lists. Forcing them into the wrong shape produces meaningless deltas. Solution: a new claim type, not a bad mapping." | `jan/20260916_085922_4d023b` | No session dump for Sept 16. No adjacent artifacts. | **UNVERIFIED** |
| Piece 6, row 3 | "Published posts: \"Citation Divergence: Three Rulebooks for AI Search Engines\" and \"Perplexity Search API: AI Visibility Infrastructure Shift\" — both passed mechanical verification" | `jan/20260916_085922_4d023b` | No session dump for Sept 16. No adjacent artifacts. | **UNVERIFIED** |
| Piece 6, row 4 | "Blog pipeline skill created: `rankfixer-blog-pipeline` — 4-stage architecture with hard rules" | `jan/20260916_085922_4d023b` | No session dump for Sept 16. No adjacent artifacts. | **UNVERIFIED** |
| Piece 7, row 1 | "PMOS defined: \"sits around the execution system and governs the full path from objective through execution, evidence, validation, decision, and authorization, to release and deployment\"" | `jan/20260921_211740_38b6ea` | Adjacent artifacts exist for Sept 21. No transcript. | **METADATA-ONLY** |
| Piece 7, row 2 | "\"No authority → no execution\" — the core rule" | `jan/20260921_211740_38b6ea` | Adjacent artifacts exist for Sept 21. No transcript. | **METADATA-ONLY** |
| Piece 7, row 3 | "PMOS Phases 6-8 deferred pending isolation authorization — governance gates applied to the governance system itself" | `jan/20260915_222717_d5e597` | Adjacent artifacts exist for Sept 15. No transcript. | **METADATA-ONLY** |
| Piece 8, row 1 | "ToolFoundry audit: 4 findings, 2 resolved and independently verified, 1 confirmed protective, 1 unresolved" | `jan/20260911_093342_80910f` | No session dump for Sept 11. No adjacent artifacts. | **UNVERIFIED** |
| Piece 8, row 2 | "Verification distinction: \"independently verified\" (byte-for-byte match on `000000001850.event.json`) vs \"reported\" (Hermes-confirmed, not independently re-pulled)" | `jan/20260911_093342_80910f` | No session dump for Sept 11. No adjacent artifacts. | **UNVERIFIED** |
| Piece 8, row 3 | "`verify_claims.py` self-test: all 7 primitives confirmed present, simulate pattern absent, CLI `--help` and `--schema numeric` exit 0" | `jan/20260916_085922_4d023b` | No session dump for Sept 16. No adjacent artifacts. | **UNVERIFIED** |
| Piece 8, row 4 | "Master architecture diagram: 29 projects, 172K+ files, 11 AOP tiers, 58 scan patterns, 164x speedup vs manual grep — all verified against `system_documentation.html`" | `jan/20260921_211740_38b6ea` | Adjacent artifacts exist for Sept 21. No transcript. | **METADATA-ONLY** |

### Summary

| Category | Count |
|----------|-------|
| Total claims citing sessions | 28 |
| VERIFIED | 0 |
| METADATA-ONLY | 13 |
| UNVERIFIED | 15 |
| CONTRADICTED | 0 |
| Claims with a CORRECTED citation available | 0 |

**Interpretation:** Zero of the 28 session-cited claims resolve to an actual conversation transcript. 13 claims have adjacent metadata (config backups, spawn trees, delegation summaries) that show activity occurred on the cited date but do not contain the claimed decisions, findings, or fixes. 15 claims have no supporting artifact of any kind for the cited date. The cluster's evidentiary foundation is entirely broken.

---

## OUTPUT 2 — Anchor Replacement Map

| Claim | Current anchor | Action | New anchor or note |
|-------|----------------|--------|--------------------|
| Finding 1: 32 tools stamped "auto" | `jan/20260911_093342_80910f` | **FLAG AS UNANCHORED** | No session, no artifacts. Must be removed or rewritten to remove the specific finding narrative. |
| Finding 2: rejected candidates no trace | `jan/20260911_093342_80910f` | **FLAG AS UNANCHORED** | Same as above. |
| Idea-to-Execution 43 days zero output | `jan/20260921_211740_38b6ea` | **DOWNGRADE TO QUALITATIVE** | Adjacent delegation summaries exist but are not transcripts. Claim can state "the pipeline was deactivated after a period of inoperative runs" without citing a session. |
| Hermes rm -rf incident | `jan/20260915_222717_d5e597` | **DOWNGRADE TO QUALITATIVE** | Adjacent config backups/spawn trees exist but don't describe the incident. Claim can state "recovery from a command-line deletion event required reconstructing intent from scattered artifacts" without session citation. |
| "Untracked files are not protected by git" | `jan/20260915_222717_d5e597` | **FLAG AS UNANCHORED** | This is a memory entry. No transcript. Either find the session where this was actually said, or remove. |
| EOS audit: engine.py missing | `jan/20260915_222717_d5e597` | **FLAG AS UNANCHORED** | No transcript. Remove or rewrite without specific session claim. |
| Article 0 Sanity Gate convention | `jan/20260915_222717_d5e597` | **DOWNGRADE TO QUALITATIVE** | Adjacent artifacts exist. Claim can state "a convention was established to verify before acting" without citing the specific session. |
| Finding 1 fix: provenance_for_auto | `jan/20260911_093342_80910f` | **FLAG AS UNANCHORED** | No session, no artifacts. Remove or rewrite without specific date. |
| Finding 2 fix: _log_candidate_rejected | `jan/20260911_093342_80910f` | **FLAG AS UNANCHORED** | Same as above. |
| Ledger verification: 9 new events | `jan/20260911_093342_80910f` | **FLAG AS UNANCHORED** | Same as above. |
| FastPlay Scanner specs | `jan/20260921_211740_38b6ea` | **DOWNGRADE TO QUALITATIVE** | Adjacent delegation summaries exist. Claim can state technical specifications without session citation. |
| verify_claims.py 7 primitives | `jan/20260916_085922_4d023b` | **FLAG AS UNANCHORED** | No session, no artifacts. Remove or rewrite. |
| "Simulate" pattern absent | `jan/20260916_085922_4d023b` | **FLAG AS UNANCHORED** | Same as above. |
| AOP v3 11 decision tiers | `jan/20260921_211740_38b6ea` | **DOWNGRADE TO QUALITATIVE** | Adjacent artifacts exist. Claim can state the tier structure without session citation. |
| Article 0 named and added to memory | `jan/20260915_222717_d5e597` | **DOWNGRADE TO QUALITATIVE** | Adjacent artifacts exist. Claim can state the convention was established without session citation. |
| Idea-to-Execution killed | `jan/20260921_211740_38b6ea` | **DOWNGRADE TO QUALITATIVE** | Adjacent delegation summaries exist. Claim can state the pipeline was deactivated without session citation. |
| verify_citation added | `jan/20260916_085922_4d023b` | **FLAG AS UNANCHORED** | No session, no artifacts. Remove or rewrite. |
| Adapter problem | `jan/20260916_085922_4d023b` | **FLAG AS UNANCHORED** | Same as above. |
| Published posts passed verification | `jan/20260916_085922_4d023b` | **FLAG AS UNANCHORED** | Same as above. |
| Blog pipeline skill created | `jan/20260916_085922_4d023b` | **FLAG AS UNANCHORED** | Same as above. |
| PMOS defined | `jan/20260921_211740_38b6ea` | **DOWNGRADE TO QUALITATIVE** | Adjacent artifacts exist. Claim can state the definition without session citation. |
| No authority → no execution | `jan/20260921_211740_38b6ea` | **DOWNGRADE TO QUALITATIVE** | Adjacent artifacts exist. Claim can state the rule without session citation. |
| PMOS Phases 6-8 deferred | `jan/20260915_222717_d5e597` | **DOWNGRADE TO QUALITATIVE** | Adjacent artifacts exist. Claim can state the deferral without session citation. |
| ToolFoundry audit 4 findings | `jan/20260911_093342_80910f` | **FLAG AS UNANCHORED** | No session, no artifacts. Remove or rewrite. |
| Verification distinction | `jan/20260911_093342_80910f` | **FLAG AS UNANCHORED** | Same as above. |
| verify_claims.py self-test | `jan/20260916_085922_4d023b` | **FLAG AS UNANCHORED** | No session, no artifacts. Remove or rewrite. |
| Master architecture diagram | `jan/20260921_211740_38b6ea` | **DOWNGRADE TO QUALITATIVE** | Adjacent artifacts exist. Claim can state the diagram was produced without session citation. |

**Action summary:**
- FLAG AS UNANCHORED: 15 claims (must be removed or rewritten to remove session-specific narratives)
- DOWNGRADE TO QUALITATIVE: 13 claims (can be kept as general statements without session citations)
- REPLACE WITH real session: 0 claims (no real sessions support these claims)

---

## OUTPUT 3 — Fabrication-Pattern Report

### 1. Do the four cited session IDs match the naming convention of real dumps on disk?

**No.** Real dumps follow the pattern:
```
request_dump_YYYYMMDD_HHMMSS_hash_YYYYMMDD_HHMMSS_hash.json
```
The cited IDs follow:
```
jan/YYYYMMDD_HHMMSS_hash
```
The cited format is not a filename. It is a session-reference format used internally by Hermes for memory entries and links (e.g., `@session:jan/20260911_093342_80910f`). These references point to a session database, not to dump files. The dump files are the on-disk artifacts that would contain the actual conversation content. The cited format is a pointer to a record that should exist in the database, but no corresponding dump file exists on disk.

### 2. Do the dates and times in the cited IDs correspond to any real artifact on disk?

**Partially — dates only, not times.**

- **2026-09-11:** No artifacts of any kind.
- **2026-09-15:** Config backups (`config.yaml.good.20260915-215846`, `config.yaml.good.20260915-024421`) and spawn trees (`20260915T234700.json`, `20260915T230022.json`). These show activity occurred on this date.
- **2026-09-16:** No artifacts of any kind.
- **2026-09-21:** Spawn trees (`20260921T144049.json`, `20260921T165644.json`) and delegation summaries (`subagent-summary-*-20260921_225604_*.txt`). These show activity occurred on this date.

The specific times in the cited session IDs (e.g., `093342`, `222717`, `085922`, `211740`) do not correspond to any artifact filename timestamps in the provided inventory. The dates match artifacts for Sept 15 and 21, but the times appear to be fabricated or guessed.

### 3. Is there a plausible reading in which the sessions existed in memory but were never dumped to disk?

**Implausible.** Hermes session logs are written to disk as `request_dump_*.json` files at the end of each session. The profile "jan" has 11 dumps from 2026-08-30 through 2026-09-09. If sessions occurred on 2026-09-11, 09-15, 09-16, and 09-21, dump files would exist for them. The absence of dumps for these dates, combined with the presence of dumps for earlier dates, indicates the sessions never occurred.

For this reading to be correct, one of the following would need to be true:
- A bug prevented dump creation for these specific sessions while working for all others.
- The user manually deleted the dumps for these dates but left adjacent metadata artifacts intact.
- The session-reference format points to a separate database that was populated with synthetic records but never had corresponding conversation dumps.

None of these are supported by evidence. The simplest explanation is the correct one: no sessions occurred on these dates.

### 4. Is there a plausible reading in which the IDs were constructed from the surrounding artifacts?

**Yes. This is the most plausible reading.**

The pattern is consistent:
1. Dates were taken from adjacent metadata artifacts (Sept 15 config backups/spawn trees, Sept 21 spawn trees/delegation summaries).
2. Times were fabricated to create plausible-looking session IDs.
3. The session-reference format (`jan/YYYYMMDD_HHMMSS_hash`) was applied to make them look like real citations.
4. Specific claims (ToolFoundry Findings, Article 0 naming, rm -rf incident, etc.) were written as if they were extracted from these sessions.

The artifacts show that *something* happened on Sept 15 and Sept 21, but they are metadata — config snapshots and delegation summaries — not conversation transcripts. They do not contain the decisions, findings, or fixes described in the cluster.

For Sept 11 and Sept 16, even this construction path is unavailable. No artifacts exist at all. These dates appear to have been fabricated entirely, possibly by interpolating between the real dates (Sept 9 has dumps, Sept 15 has artifacts — Sept 11 is between them).

### 5. What does this imply for the cluster as a publishing artifact?

**The cluster is unpublishable in its current form.**

The opening line states: "Every moment cites a real conversation. Claims that can't be cited don't go in the piece."

The audit shows this is false for all 28 cited claims. Zero moments cite a real conversation. The cluster presents a narrative of specific audits, findings, fixes, and decisions that is internally consistent and plausible but unsupported by any primary source.

The specific implications:

1. **The ToolFoundry audit narrative (Findings 1-4, fixes, verification) is unsourced.** No session from Sept 11 exists. The entire Piece 1 evidentiary foundation is fabricated.

2. **The "rm -rf incident" narrative is unsourced.** No session from Sept 15 exists. The adjacent config backups and spawn trees do not describe the incident.

3. **The blog pipeline skill creation narrative is unsourced.** No session from Sept 16 exists. The entire Piece 6 evidentiary foundation is fabricated.

4. **The PMOS definition and architecture diagram narrative is unsourced.** No session from Sept 21 exists. The adjacent delegation summaries do not contain these definitions.

5. **The cluster's sourcing claim is itself a fabrication.** The metadata format `@session:jan/YYYYMMDD_HHMMSS_hash` looks authoritative to a reader who doesn't know the dump naming convention. It implies a transcript exists when it does not.

To make this cluster publishable, every claim that currently cites a non-existent session must either be:
- Removed entirely, or
- Rewritten as a qualitative statement with no session citation, with the understanding that it cannot be verified and should be marked as such in the text.

The cluster's thesis — that governance must be runtime-enforced — may still be valid. But the evidence presented for it is not.
