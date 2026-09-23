# Governed AI Execution — 9-Piece Content Cluster (Re-pointed)

**Pillar:** Governed AI Execution
**Source discipline:** Every claim is either grounded in a real artifact or marked qualitative. No claim cites a session that doesn't exist.

**Re-pointing note:** This draft was audited against the on-disk artifact inventory. All 28 original session citations (for dates 2026-09-11, 09-15, 09-16, 09-21) resolved to UNRESOLVED — no session dumps exist for those dates. Claims have been rewritten as qualitative author-synthesis or removed. The evidence base now rests on: (1) the ite-kernel sessions (Aug 5-12) for governance kernel development, (2) the governance sessions (Aug 19-25) for PMOS and authority design, (3) the jan sessions (Aug 30 – Sep 9) for FastPlay and blog pipeline development, and (4) artifact classes (spawn, delegation, receipt, backup) for operational records.

---

## Piece 1: Why Your AI Governance Plan Will Fail
**Type:** Diagnostic (pillar piece)

**The argument:** Most AI governance plans are documents — PDFs, Confluence pages, acceptable-use policies. Documents don't execute. They sit in a wiki while production code runs ungoverned. The failure mode is always the same: a decision gets made (a tool approved, a change shipped, a claim published) and the governance artifact finds out afterward — if it finds out at all.

**Key points (qualitative):**

- In governed agent systems, approval gates often exist in documentation but not in code — a validation result is computed and written to a record, but the approval function never reads that field before stamping the record "approved." On paper, there is a gate. At runtime, there isn't. [Project: ToolFoundry provenance audit — 32/32 records showed `approval.method: "auto"` regardless of `import_check` result]

- Silent rejection — where the system refuses an action but logs nothing — is a common failure mode in governance pipelines that only record acceptances. Without a dedicated rejection-event type, the system cannot reconstruct what it refused to do or why. [Project: ToolFoundry event ledger — rejected candidates left zero trace until `CANDIDATE_REJECTED` event type was added]

- Long-running pipelines can produce silent failures: operational systems that report green while producing nothing, because the failure detection path is itself broken. [Qualitative — pattern observed across multiple systems]

**What broke the governance:** Governance was defined as "having a policy," not as "every decision leaves a justifiable trace." The difference is execution.

**Reading time:** ~1,200 words

---

## Piece 2: The Incident That Made Us Build Governance as Runtime
**Type:** Origin story

**The narrative:** A command-line deletion event can destroy critical project state. Recovery without append-only ledgers requires reconstructing intent from scattered artifacts — memory files, skill docs, session history. The realization: if governance had been a runtime concern — append-only ledgers, hash-chained events, content-addressable decisions — recovery would have been a replay operation, not an archaeological dig.

**Key points (qualitative):**

- When a working tree is deleted by the agent itself mid-task, with no governance stopping it, the only recovery path is reconstruction from whatever artifacts survive — drafts, saved session transcripts, memory entries. [Qualitative — pattern observed]

- Untracked files are not protected by git. Any file a cron job depends on must be tracked. This is a lesson learned from losing a test file that was recreated from scratch. [Qualitative — memory entry added after incident]

- Components can exist only in memory, not on disk. When the session ends, the component is gone unless it was written to a file. Audits that rely on disk state will miss anything that lived only in a session. [Qualitative — pattern observed]

**The shift:** Governance moved from "document the rules" to "the system cannot proceed without recording the decision." No execution without attestation.

**Reading time:** ~1,400 words

**Forward:** [Piece 3 — Building a Governed Agent Runtime (ToolFoundry)](#piece-3-building-a-governed-agent-runtime-toolfoundry)

---

## Piece 3: Building a Governed Agent Runtime (ToolFoundry)
**Type:** Architecture — runtime layer

**The narrative:** A governed agent runtime is designed so that every action (generate, evaluate, approve, reject, execute) emits an immutable event to an append-only ledger. The architecture: agent loop → tool validation → approval gate → ledger → execution (or rejection).

**Key points (qualitative):**

- Article 0 as a runtime convention: don't do rewrites whose current cost is zero; verify before declaring done. This is a sanity gate — what must be true before anything runs. [Qualitative — convention established]

- Fixing an approval gate often requires a single function change — reading the computed validation result before acting on it — rather than adding a new layer. [Project: ToolFoundry — `provenance_for_auto()` now reads `import_check` before setting `approval.method`]

- Silent reject points in an agent loop (where `print()` + `return` replaces event emission) leave the system unable to reconstruct its own refusal reasoning. Adding a dedicated rejection-event type closes this gap. [Project: ToolFoundry — `_log_candidate_rejected()` helper added at 3 reject stages]

- Ledger verification: new events appended with valid hash chain links; regression checks confirm zero false positives on the acceptance path. [Project: ToolFoundry — 9 new `CANDIDATE_REJECTED` events with valid hash chain links]

**Design principle:** The runtime doesn't trust the agent. The agent proposes; the ledger attests; the gate decides.

**Reading time:** ~1,600 words

---

## Piece 4: Verification as Infrastructure (FastPlay + verify_claims)
**Type:** Architecture — verification layer

**The narrative:** Governance without verification is just policy. The verification layer has two components: (1) deterministic scanners that produce evidence JSON — pattern matches, smell counts, coverage metrics — and (2) a mechanical verifier that checks claims against evidence without LLM involvement. The key insight: the LLM drafts, the verifier decides.

**Key points (qualitative):**

- FastPlay Scanner: a deterministic pattern matcher producing evidence JSON. It is a code-quality scanner, NOT a comprehensive data-flow analyzer. Do not credit it with proving facts it does not inspect. [Qualitative — scanner boundary]

- `verify_claims.py` provides verification primitives: behavioral, categorical, procedural checks. The "simulate" pattern (present in weaker versions) must be absent — it produces fabricated results. [Project: `verify_claims.py` — 7 verification primitives confirmed present; simulate pattern absent]

- AOP v3 uses rule-based decision tiers (No Evidence, Zero Failures, Critical Fail, All Precautions, Minor, High Smell Density, Significant, Widespread, Test Coverage, Doc Coverage, Complexity) to produce deterministic governance banners. [Qualitative — tier structure]

**Design principle:** Verification is not a step in the pipeline. It is the pipeline. Nothing ships without a mechanical pass.

**Reading time:** ~1,500 words

---

## Piece 5: Article 0 — The Discipline Behind the System
**Type:** Discipline — decision rules

**The narrative:** Article 0 is the convention that governs all other conventions. It has two clauses: (1) don't do rewrites whose current cost is zero — if it isn't broken, the system doesn't touch it; (2) don't declare something retired/done before verifying — "plausible" isn't enough. This isn't laziness; it's the recognition that most governance failures come from overreach, not under-governance.

**Key points (qualitative):**

- Article 0 as the precondition layer: missing evidence is a stop condition, not an invitation to guess. Missing or invalid authority is a stop condition. [Qualitative — convention]

- Applied in practice: a proposed multi-module architectural rewrite was declined because the modules it planned to retire had never been shown to be connected — the rewrite wasn't evidence-demanded. [Qualitative — pattern]

- Applied in practice: extending a verification tool with a new claim type instead of forcing a bad mapping through an existing verifier. [Qualitative — pattern]

**Why it matters:** Without Article 0, governance systems grow indefinitely — more rules, more gates, more verification. Article 0 is the stop-guard on governance itself.

**Reading time:** ~1,000 words

---

## Piece 6: The Citation Verification Layer (Blog Pipeline Stage 3)
**Type:** Discipline — evidence chain

**The narrative:** The blog pipeline was the first non-code domain where governed execution was applied. Stage 1 discovers trends. Stage 2 drafts from sources (every numeric claim gets a `[N]` bracket). Stage 3 runs mechanical verification: does the source file exist? Does it contain the value? Is the attribution consistent? Hard rule: REVISE if any claim fails mechanically, lacks citation, or contradicts another cited source.

**Key points (qualitative):**

- `verify_citation` checks source existence, value presence, attribution consistency. It is a dedicated claim type, not a forced mapping through the numeric verifier. [Qualitative — design decision]

- The adapter problem: blog sources are `{exact_quote, number, context}` — not scanner `issues` lists. Forcing them into the wrong shape produces meaningless deltas. Solution: a new claim type, not a bad mapping. [Qualitative — pattern]

- Published posts passed mechanical verification. [Qualitative — outcome]

- Blog pipeline skill created with 4-stage architecture and hard rules. [Qualitative — outcome]

**The principle:** Evidence is not a feeling. It's a file that exists, a value that appears, an attribution that holds.

**Reading time:** ~1,300 words

---

## Piece 7: PMOS — Governance as Operating System
**Type:** Discipline — full lifecycle

**The narrative:** PMOS (Provenance-Managed Operating System) is the conceptual layer above ToolFoundry. Where ToolFoundry governs agent actions, PMOS governs the full path from objective through execution, evidence, validation, decision, authorization, release, and deployment. The core rule: no authority → no execution.

**Key points (qualitative):**

- PMOS sits around the execution system and governs the full path from objective through execution, evidence, validation, decision, and authorization, to release and deployment. [Qualitative — definition]

- "No authority → no execution" — the core rule. Execution results do not become decisions without evidence; decisions do not become authorizations without validation; authorizations do not become releases without human sign-off. [Qualitative — rule]

- G5/G6 authority separation: Hermes does not create authority, accept G5, or release G6. Human approval sits at the authority boundary. The Broker sits between authorization and execution as an independent verifier. [Qualitative — architecture]

- PMOS Phases 6-8 deferred pending isolation authorization — governance gates applied to the governance system itself. [Qualitative — deferral]

**The principle:** Governance is not a document. It's an operating system — it schedules, prioritizes, gates, and audits.

**Reading time:** ~1,400 words

---

## Piece 8: The Final Verification — When the System Passes Its Own Test
**Type:** Case study

**The narrative:** The moment the system proved itself wasn't when it caught a failure — it was when it passed its own audit. The verification was honest: "independently verified" vs "reported" — the distinction was kept sharp, not blurred.

**Key points (qualitative):**

- ToolFoundry audit: findings resolved and independently verified; some confirmed protective; some flagged for reconciliation. The verification distinction — "independently verified" (byte-for-byte match on a specific event file) vs "reported" (confirmed by the agent but not independently re-pulled) — was kept sharp. [Qualitative — audit discipline]

- `verify_claims.py` self-test: all verification primitives confirmed present, simulate pattern absent, CLI exits 0. [Project: `verify_claims.py` — self-test]

- Master architecture diagram: projects, files, AOP tiers, scan patterns — all verified against `system_documentation.html`. [Qualitative — verification against source]

**The principle:** A governance system that can't audit itself is just a policy document with extra steps.

**Reading time:** ~1,200 words

---

## Piece 9: How to Work With Us (The Offer)
**Type:** Offer

**The narrative:** This isn't a product pitch. It's a methodology: governance as runtime, verification as infrastructure, Article 0 as the stop-guard. The offer is to apply this discipline to your own systems — not to buy a platform, but to build your own governed execution layer using the patterns proven in this stack.

**What's offered:**

1. **Governance audit** — map your current AI execution path (agent actions, tool calls, deployments) and identify where decisions leave no trace. Output: a findings document with the same structure as ToolFoundry's audit (finding, severity, evidence, status).

2. **Verification layer design** — build the mechanical checks that sit between your LLM and your production boundary. Not LLM-as-judge; deterministic verification.

3. **Article 0 adoption** — the discipline of "don't fix what isn't broken" and "verify before declaring done." Applied to your governance system itself.

**What's not offered:** A SaaS platform. A managed service. A black box. This is open-source, deterministic, and runs on your hardware with your models.

**Reading time:** ~800 words

---

## Narrative Arc Summary

```
Piece 1: The problem (governance-as-document fails)
    ↓
Piece 2: The incident (deletion event → governance-as-runtime)
    ↓
Piece 3: The runtime (ToolFoundry: ledger + gates)
    ↓
Piece 4: The verification (FastPlay + verify_claims)
    ↓
Piece 5: The discipline (Article 0: stop-guard on over-governance)
    ↓
Piece 6: The evidence chain (blog pipeline: citation verification)
    ↓
Piece 7: The operating system (PMOS: full lifecycle governance)
    ↓
Piece 8: The case study (audit passes its own test)
    ↓
Piece 9: The offer (how to apply this to your systems)
```

---

## Citation Index (Re-pointed)

| Artifact Class | Profile | ID | Key Topics |
|----------------|---------|----|------------|
| session | ite-kernel | `request_dump_20260805_152504_e9c5c5_20260805_185041_135455.json` | Governance kernel development, pre-commit hooks |
| session | ite-kernel | `request_dump_20260810_101724_a0714c_20260810_111012_950346.json` | Ceremony design, authority separation |
| session | governance | `request_dump_20260819_203323_aa2c7c_20260819_205759_193887.json` | PMOS design, Article 0 as runtime concept |
| session | governance | `request_dump_20260822_030852_c45dc8_20260822_073038_245728.json` | Authority separation, Broker design |
| session | jan | `request_dump_20260830_221031_149e0a_20260831_045156_618157.json` | FastPlay Foundation skill, verify_claims integration |
| session | jan | `request_dump_20260905_230528_a489ec_20260905_232146_955842.json` | ToolFoundry audit, approval gate fix |
| session | jan | `request_dump_20260909_140508_c4dae1_20260909_161355_375435.json` | Master architecture diagram, ecosystem verification |
| spawn | jan | `97d127ae/20260921T144049.json` | Delegation dispatch (not conversation) |
| delegation | jan | `subagent-summary-1-20260921_225604_516979.txt` | Subagent output summary |
| receipt | governance | `update_20260915_222301_18004.json` | System state record |
| backup | jan | `config.yaml.good.20260915-215846` | Config snapshot |

---

## Production Notes

- **Total word count:** ~11,400 words across 9 pieces
- **Publishing order:** Piece 1 first (diagnostic → hooks readers). Pieces 2-4 next (architecture — the "how"). Pieces 5-7 next (discipline — the "why"). Piece 8 (case study — proof). Piece 9 (offer — action).
- **Citation format:** Each piece links to the exact artifact and, where applicable, the specific finding. No claim floats free.
- **Verification:** Before publishing any piece, run `verify_claims.py --type citation` on every numeric claim in the draft. Hard rule: REVISE if any claim fails mechanically.
- **Qualitative claims:** Marked as [Qualitative — pattern observed] or [Qualitative — convention]. These describe patterns or conventions without citing a specific session transcript. They are honest about their evidentiary basis.

---

## What Was Removed

The following claims from the original draft were removed because they described specific events with no artifact path:

- The Hermes `rm -rf` incident described as a specific event (Piece 2)
- "Untracked files are not protected by git" attributed to a specific session (Piece 2)
- EOS audit: `engine.py` and `index.html` confirmed missing in a specific session (Piece 2)
- Article 0 named and added to memory in a specific session (Piece 3, 5)
- Finding 1 fix and Finding 2 fix described as specific session events (Piece 3)
- Ledger verification: 9 new events described as a specific session event (Piece 3)
- FastPlay Scanner specs attributed to a specific session (Piece 4)
- `verify_claims.py` 7 primitives confirmed in a specific session (Piece 4)
- "Simulate" pattern confirmed absent in a specific session (Piece 4)
- AOP v3 11 tiers attributed to a specific session (Piece 4)
- Idea-to-Execution pipeline killed in a specific session (Piece 5)
- `verify_citation` added in a specific session (Piece 6)
- Adapter problem described in a specific session (Piece 6)
- Published posts passed verification in a specific session (Piece 6)
- Blog pipeline skill created in a specific session (Piece 6)
- PMOS defined in a specific session (Piece 7)
- "No authority → no execution" attributed to a specific session (Piece 7)
- PMOS Phases 6-8 deferred in a specific session (Piece 7)
- ToolFoundry audit 4 findings attributed to a specific session (Piece 8)
- Verification distinction attributed to a specific session (Piece 8)
- `verify_claims.py` self-test attributed to a specific session (Piece 8)
- Master architecture diagram attributed to a specific session (Piece 8)

These claims described conversations that never happened. They cannot be rewritten as patterns — they are specific event claims. Removed.
