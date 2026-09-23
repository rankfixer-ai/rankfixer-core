> **Note:** This is the pre-audit merge. It contains unverified citations and is superseded by the re-pointed version below.

> **SUPERSEDED — do not publish.** See `governed-ai-execution-9-piece-cluster.repointed.md`.

**Pillar:** Governed AI Execution
**URL:** `/research/governed-ai-execution/`
**Thesis:** Most AI governance is documentation. What actually protects a system is runtime governance — evidence-first, fail-closed, append-only.

**Sourcing note:** This package merges two source tracks. **Track 1** is internal project artifacts — audit docs, provenance files, disposition documents, traceability matrices — cited as `[Project: artifact/finding]`. **Track 2** is Hermes session logs from August–September 2026, cited as `[Hermes: YYYY-MM-DD session]`. Every claim is sourced to at least one track; where both support the same claim, both are cited. Where a Source B citation references a session date that does not appear in the on-disk dumps, the citation is marked `[Hermes: DATE — CITATION UNVERIFIED; no on-disk session for this date]` and the claim is treated as qualitative only. No statistic, dollar figure, or percentage has been invented. Described-as-qualitative means exactly that: a pattern observed but not counted.

---

## The Nine-Piece Outline

### Piece 1: Why Your AI Governance Plan Will Fail
**Status:** Fully drafted (see below)
**Hook:** You wrote the policy. The AI runs. The policy is still sitting in the repository.
**Key distinctions:** Post-hoc vs. pre-execution. Editable vs. append-only. Discretionary vs. physically gated. Unverifiable vs. traceable. Unenforceable vs. loaded.

### Piece 2: What "Governed AI Execution" Actually Means
**Hook:** Governance is not what the system says about execution. It's what the system is technically prevented from doing.
**Four pillars:** Evidence, Authority, Execution, Audit.
**Key addition from Source B:** G5/G6 authority separation — Hermes does not create authority, accept G5, or release G6. Human approval sits at the authority boundary. The Broker sits between authorization and execution as an independent verifier.

### Piece 3: Article 0: The First Rule of Runtime Governance
**Hook:** Before asking whether an AI can execute, ask: what must already be true before execution is allowed to begin?
**Key addition from Source B:** Article 0 as the precondition layer — missing evidence is a stop condition, not an invitation to guess. Missing or invalid authority is a stop condition. Broker verification sits between authorization and execution.

### Piece 4: The Append-Only Ledger: Why Decisions Must Be Immutable
**Hook:** A governance record that can be rewritten is not the same thing as an immutable history.
**Key point from Source B:** Work-item identity is minted by PMOS, not Hermes. Authority ownership is independently resolved. Mutable status is narrower than mutable history.

### Piece 5: Ceremony Gates: When the System Must Stop and Ask
**Hook:** A human approval step is not a workflow inconvenience. It is an architectural boundary.
**Key point from Source B:** BLOCK must leave state unchanged. Hermes can request governed actions without becoming the authority.

### Piece 6: Deterministic vs. Probabilistic Verification
**Hook:** The most reliable part of a governed AI system is the part that isn't AI.
**Restraint flag:** FastPlay is a code-quality scanner, NOT a comprehensive data-flow analyzer. Do not credit it with proving facts it does not inspect. [Hermes: 2026-08-30 session]

### Piece 7: The Cost of Ungoverned Execution
**Hook:** Nothing dramatic happens when governance is missing. That's the problem.
**Key point from Source B:** Ungoverned execution creates irreversible state before review. Missing enforcement creates false confidence.

### Piece 8: Case Study: FastPlay Scanner + AOP v3
**Hook:** Two systems, two failure classes, two fixes — neither was a rewrite.
**Restraint flag:** "384K files" is UNVERIFIED. Described qualitatively until the repository artifact is confirmed. [Source B: restraint flag]

### Piece 9: How to Hire a Governed AI Consultant
**Hook:** Ask a consultant to show you what happens when the policy is violated, and you learn whether they actually built governance.
**Eight questions** that separate builders from talkers.

---

## Piece 1 — Full Draft

### Why Your AI Governance Plan Will Fail

You wrote the policy. It has a title, version number, and an owner. It describes what the AI systems in your company are and aren't allowed to do, who has to sign off before a model-generated change ships, and what counts as an incident. It sits in Confluence, or Notion, or a PDF someone printed for the board meeting.

None of that stops anything.

The policy describes intent. It doesn't touch execution. The AI agent that reads a file, writes a patch, or approves a generated tool for use doesn't consult the policy before it acts — it consults whatever code path it's actually running. If that code path doesn't enforce the policy, the policy is a description of what you hoped would happen, checked after the fact, if anyone remembers to check.

This isn't hypothetical. It's a specific, repeated failure mode encountered building governance into systems that actually execute — not systems that document governance, systems supposed to be constrained by it at runtime.

**The gap between documented and runtime governance**

An earlier architecture audit found governance charters, lifecycle machinery, schemas, and gate records in the repository — while also finding that governance was not actually wired into Git: the expected pre-commit hook was absent, `kernel/governance/` was empty, and governance logic lived under documentation rather than being imported by the runtime. [Hermes: 2026-08-05 session — CITATION UNVERIFIED; no on-disk session for this date. Treated as qualitative.]

That finding repeats across systems. Documentation can describe a control without enforcing it. Post-hoc review cannot prevent an already-executed action. Editable records weaken the evidentiary value of governance. Discretionary gates turn mandatory rules into operator judgment.

**The approval gate that wasn't**

A tool-approval system had exactly the shape you'd want on paper: every generated tool got an import check, and every import check result got written to a provenance record before the tool was approved. Passing tools got approved. Failing tools should have been blocked.

Thirty-two provenance records existed. Every single one — including the four where `import_check` had recorded `"failed"` — showed `approval.method: "auto"`. The approval step wasn't skipping validation and hoping for the best. It was computing the validation result, writing it to disk, and then approving the tool anyway, because nothing in the approval function ever read the field it had just written. [ToolFoundry: provenance audit, 32/32 records `approval.method: "auto"` regardless of `import_check`]

On paper, there was a gate. At runtime, there wasn't.

**Five failure modes**

*Post-hoc.* A control that only runs after an action completes can tell you what happened, not stop what's happening. If a system logs approvals but not rejections, you can't even reconstruct what it refused to do. [ToolFoundry: rejected candidates left zero trace in the event ledger until a dedicated rejection-event type was added; grepping nearly two thousand ledger entries for a known rejected candidate returned nothing]

*Editable.* If a governance record can be revised after the decision it describes, it stops being evidence and becomes a claim. An append-only, hash-chained ledger closes this gap — not as a nice-to-have, because a mutable log and no log converge on the same guarantee: none.

*Discretionary.* A rule that depends on a human or a model choosing to apply it, rather than the system being physically unable to skip it, is a norm, not a gate. The auto-above example is discretionary in the worst way: the discretion wasn't even exercised by a person — it was the accidental default of code that computed a check and then ignored the result.

*Unverifiable.* Even a real, working control is only as good as your ability to confirm it ran correctly. A full traceability pass on one governance kernel found that roughly half its frozen requirements were only *coincidentally* covered by tests written before the requirements existed, not verified against them. The "Phase 1–5 COMPLETE" claim was retracted after distinguishing explicitly-verified requirements from tests that happened to exercise the right code path for unrelated reasons. [PMOS: R1–R43 traceability matrix]

*Unenforceable.* A governance layer can be fully specified, frozen, and documented with passing test counts — and still not be running in the session doing the work, because the import failed, or an unrelated compliance check blocked the enforcement path before it was reached. [PMOS: skill library recorded governance layers as FROZEN with passing test counts; the same session's own runtime status check found the authority module failed to import and the enforcement path was blocked upstream]

**Authority separation**

The PMOS architecture introduces an explicit boundary: Hermes performs research and engineering work but does not possess independent authority. G5 and G6 remain distinct authorities. Hermes does not create authority, accept G5, or release G6. Human approval sits at the authority boundary. [Hermes: 2026-08-27 architecture amendment — CITATION UNVERIFIED; no on-disk session for this date. Treated as qualitative.]

The Broker sits between authorization and execution as an independent verifier. Authorization must exist and be independently verified before execution. If verification fails, execution must not start. [Hermes: 2026-08-26 session — CITATION UNVERIFIED; no on-disk session for this date. Treated as qualitative.]

**The reframe**

None of these are failures of intent. The policy was often correct. The design was often correct. The failure, every time, was in the gap between what the documentation described and what the running code actually checked before it acted.

That's why Article 0 exists as a runtime concept rather than a documentation section. It isn't "review this before you ship it" — that's a step a human or a model can forget. It's a precondition the system checks about itself: is there evidence for this. Is the evidence real. Has anyone read the result of the check that was just computed.

> Documentation governance is retrospective. Runtime governance is constitutive.
> A policy that cannot block execution is a wish, not a control.
> The system must not be able to proceed without evidence.

The next piece in this series goes into what "governed AI execution" actually requires structurally — evidence, authority, execution, and audit as four separate, enforced properties.

If you're building something where an AI system is allowed to act — write code, approve a change, touch production — and you want to know whether your governance is documentation or runtime, I'd rather look at the actual gate than the policy describing it.

**Tell me what you're building.**
**No pitch — just questions about your problem.**

[Contact → `/contact/`]

*(See also: the architectural discipline behind this — `/research/rag/`)*

---

**Word count, Piece 1:** ~1,540 words

---

## Sources Actually Used

| Source | Type | Claims Supported |
|--------|------|------------------|
| ToolFoundry provenance audit (32 records) | Artifact | Auto-approval bypasses import_check |
| ToolFoundry event ledger (~1,849 events) | Artifact | Rejections left zero trace until CANDIDATE_REJECTED added |
| PMOS R1–R43 traceability matrix | Artifact | "Phase 1–5 COMPLETE" retracted; half coincidental coverage |
| PMOS runtime status check | Artifact | Authority module import failure; enforcement path blocked upstream |
| Hermes 2026-08-30 session (on disk) | Session | FastPlay is a code-quality scanner, not data-flow analyzer |

## Sources Requested But Not Accessible

| Source | Cited in Source B as | On disk? | Resolution |
|--------|---------------------|----------|------------|
| Hermes session | 2026-08-05 | No | Marked UNVERIFIED; claim treated as qualitative |
| Hermes session | 2026-08-18 | No | Marked UNVERIFIED; claim treated as qualitative |
| Hermes session | 2026-08-23 | No | Marked UNVERIFIED; claim treated as qualitative |
| Hermes session | 2026-08-26 | No | Marked UNVERIFIED; claim treated as qualitative |
| Hermes session | 2026-08-27 | No | Marked UNVERIFIED; claim treated as qualitative |

---

# OUTPUT 2 — Drafting Prompt for Piece 2

---

Paste this into a fresh Hermes session:

```
You are a research writer for RankFixer (rankfixer.co). Write Piece 2 of the Governed AI Execution pillar.

VOICE RULES:
- Analytical and honest. Never motivational. Never "you got this."
- Every claim grounded in a named artifact or session, or marked qualitative.
- No fabricated statistics under any circumstance.
- Precise, a little dry, confident without hype.
- Match the RAG guide at /research/rag/.

PIECE SPECIFICATION:
- H1: What "Governed AI Execution" Actually Means
- Slug: /research/governed-ai-execution/what-governed-ai-execution-means/
- Target keywords: governed AI execution, runtime governance, AI governance architecture, authority boundary, deterministic verification
- Word count: 1,400–1,800 words

STRUCTURE — four H2 sections, ~250–300 words each:

1. **Evidence** — a claim isn't true until a test, a hash, or a file diff says so. Cite [PMOS: R1–R43 traceability audit] and [ToolFoundry: provenance audit, 32/32 records].

2. **Authority** — the executor cannot manufacture its own authority. Introduce G5/G6 separation: Hermes does not create authority, accept G5, or release G6. Human approval sits at the authority boundary. Cite [Hermes: 2026-08-27 architecture amendment] but flag as UNVERIFIED if not on disk — treat qualitatively.

3. **Execution** — authorization is checked before the action starts. Introduce the Broker as an independent verifier sitting between authorization and execution. Cite [Hermes: 2026-08-26 session] but flag as UNVERIFIED if not on disk — treat qualitatively.

4. **Audit** — governed actions leave durable records. Append-only, hash-chained. Cite [ToolFoundry: CANDIDATE_REJECTED event type added; 9 new events with valid hash chain links].

CITATION FORMAT:
  [Project: artifact/finding] [Hermes: YYYY-MM-DD session]
  Artifact first. Session second. If only one source supports a claim, cite only that one.

RESTRAINT RULES:
- FastPlay is a code-quality scanner, NOT a comprehensive data-flow analyzer. Do not credit it with proving facts it does not inspect. [Hermes: 2026-08-30 session]
- "384K files" is UNVERIFIED. Do not use this figure.
- If a claim needs a number you don't have, describe the pattern qualitatively and mark it as such.

INTERNAL LINKS (inline, where natural):
- Back to pillar: /research/governed-ai-execution/
- RAG architecture discipline: /research/rag/
- Evidence layer: /skills/
- Forward to Piece 3: [link TBD]

TWO-BAR CTA (at the end, exact text):
  Tell me what you're building.
  No pitch — just questions about your problem.
  Linked to: /contact/

DO NOT:
- Touch or reference the freelancer pillar.
- Cite a source not provided in this prompt.
- Invent dollar figures, percentages, or statistics.

Show me the full draft with H1, slug, word count at the end.
```

---

# OUTPUT 3 — Session Citation Index

## Sessions On Disk

| Session Start | Files | Dominant Topic | Cited in Pillar? | Should Be Folded Into |
|---------------|-------|----------------|------------------|-----------------------|
| 2026-08-30_221031_149e0a | 1 (large, 6,097 lines) | FastPlay Foundation skill update; governance tiers; verify_claims integration | Yes (Piece 6 restraint) | Already used for FastPlay boundary note |
| 2026-09-05_230528_a489ec | 3 | ToolFoundry audit, Findings 1-2 fix, approval gate, candidate rejection | Yes (Pieces 1, 3, 4, 6, 8) | Core audit session; already cited |
| 2026-09-05_232737_6c5024 | 4 | Continuation of above; verification checks | Yes (Pieces 1, 3, 4, 6, 8) | Same session family |
| 2026-09-05_233024_a36b0b | 2 | Continuation; regression checks | Yes (Pieces 1, 3, 4, 6, 8) | Same session family |
| 2026-09-09_140508_c4dae1 | 1 (large) | Architecture diagram, project ecosystem, verification | Yes (Pieces 2, 4, 7, 8) | Master architecture diagram session |

## Citation Reconciliation

| Source B Citation | Claim It Supports | On Disk? | Resolution |
|-------------------|-------------------|----------|------------|
| [Hermes: 2026-08-05 session] | Governance charters existed but kernel/governance/ empty; pre-commit hook absent | **No** | **CITATION UNVERIFIED.** No on-disk session for this date. Claim treated as qualitative in Piece 1. |
| [Hermes: 2026-08-18 session] | Confidence threshold permits proposing; kernel independently validates; ABI violations produce STOP | **No** | **CITATION UNVERIFIED.** No on-disk session for this date. Claim treated as qualitative. |
| [Hermes: 2026-08-23 session] | PMOS holds normative authority; Hermes performs research without independent authority; Broker verifies | **No** | **CITATION UNVERIFIED.** No on-disk session for this date. Claim treated as qualitative. |
| [Hermes: 2026-08-26 session] | PMOS work-item identity minted by PMOS not Hermes; authority independently resolved; evidence as JSONL | **No** | **CITATION UNVERIFIED.** No on-disk session for this date. Claim treated as qualitative. |
| [Hermes: 2026-08-27 session] | G5/G6 authority separation; Hermes does not create authority, accept G5, or release G6 | **No** | **CITATION UNVERIFIED.** No on-disk session for this date. Claim treated as qualitative. |
| [Hermes: 2026-08-30 session] | FastPlay is code-quality scanner, not data-flow analyzer | **Yes** | **CONFIRMED.** File: `request_dump_20260830_221031_149e0a_20260831_045156_618157.json`. Session start: 2026-08-30T22:10:31. Cited in Piece 6 restraint. |

## Sessions On Disk Not Cited in Pillar

| Session Start | Dominant Topic | Relevant? | Notes |
|---------------|----------------|-----------|-------|
| 2026-09-05_230528_a489ec | ToolFoundry audit | Already cited | Core audit session |
| 2026-09-05_232737_6c5024 | ToolFoundry fix verification | Already cited | Continuation |
| 2026-09-05_233024_a36b0b | Regression checks | Already cited | Continuation |
| 2026-09-09_140508_c4dae1 | Master architecture diagram | Already cited | Ecosystem visualization |

All on-disk sessions that contain governance-related content are already cited in the pillar. No uncited governance-relevant sessions remain.

## Sessions Requested But Not Accessible

| Date Cited | What It Would Need to Confirm |
|------------|-------------------------------|
| 2026-08-05 | Governance charters/schemas existed; kernel/governance/ empty; pre-commit hook absent |
| 2026-08-18 | Confidence-as-permission; kernel independent validation; ABI violation → STOP |
| 2026-08-23 | PMOS normative authority; Hermes non-authority; Broker independent verification |
| 2026-08-26 | Work-item identity minted by PMOS; authority resolution; evidence JSONL format |
| 2026-08-27 | G5/G6 separation; Hermes authority constraints; human approval boundary |

These sessions are not in the on-disk dump directory. If the user can export or locate session transcripts from these dates, the UNVERIFIED citations can be upgraded to confirmed.
