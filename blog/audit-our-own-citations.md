# We Audited Our Own Citations

**Slug:** `/research/governed-ai-execution/audit-our-own-citations/`

---

Twenty-eight claims cited conversation sessions. Zero resolved.

We built a nine-piece content cluster on governed AI execution. Every claim cited a specific session — `@session:jan/20260911_093342_80910f`, `@session:jan/20260915_222717_d5e597`, and others. When we ran the citations against the on-disk artifact inventory, none of them existed. Not one session dump matched the cited IDs. The cluster's evidentiary foundation was entirely fabricated — not by malice, not by carelessness about truth, but by a mechanism that is itself the exact failure mode the pillar describes.

This is the story of that audit, the mechanism, and the mechanical fix.

> This piece is about a nine-piece cluster publishing immediately after it. Read that first if you want the full context — or read this first if you want the failure analysis before the artifact.

## What we were trying to build

The cluster argued one thesis: governance is not what the system says about execution. It is what the system is technically prevented from doing.

The nine pieces moved from problem (documentation governance fails) to origin (a deletion event that forced runtime governance) to architecture (ToolFoundry, PMOS, verify_claims) to discipline (Article 0, citation verification, ceremony gates) to offer (how to apply the methodology). Each piece cited specific sessions where decisions were made, fixes were implemented, designs were named.

The thesis was sound. The structure was sound. The citations were fiction.

## How the fabrication happened

The mechanism was structural, not intentional.

Real work existed. The project has 63 session dumps across three profiles: `ite-kernel` (Aug 5–12) for governance kernel development, `governance` (Aug 19–25) for PMOS and authority design, `jan` (Aug 30 – Sep 9) for FastPlay and blog pipeline development. Real artifacts exist for Sept 15 and 21: spawn trees (`jan/spawn-trees/e8cd1bf3/`, `jan/spawn-trees/fe353311/`, `jan/spawn-trees/97d127ae/`), delegation summaries (`jan/cache/delegation/subagent-summary-1-20260921_225604_516979.txt`), receipts (`governance/logs/update_receipts/update_20260915_222301_18004.json`), and config backups (`jan/backups/config/config.yaml.good.20260915-215846`).

The cluster did not cite these real sessions and artifacts. Instead, it constructed session-shaped anchors from adjacent metadata:

- **Dates** came from artifacts sharing the date prefix. Sept 15 had config backups and spawn trees. Sept 21 had spawn trees and delegation summaries. Sept 11 and 16 had nothing at all — those dates were interpolated between real dates.
- **Times** were fabricated. The cited session IDs (`20260911_093342_80910f`, `20260915_222717_d5e597`, `20260916_085922_4d023b`, `20260921_211740_38b6ea`) contain timestamps that do not appear in any artifact filename.
- **The format** matched the citation class the pillar itself demands: `@session:jan/<YYYYMMDD>_<HHMMSS>_<hash>`. The format looked correct. No check verified the artifact existed.

The result: 28 citations, all structurally valid, all pointing to nothing.

## The audit

We built a resolver — `resolve_citations.py` — that parses every citation, checks the artifact path against disk, and emits one of three states: RESOLVED, UNRESOLVED, or CONTRADICTED.

The classification:

| Status | Count |
|--------|-------|
| RESOLVED | 0 |
| UNRESOLVED | 28 |
| CONTRADICTED | 0 |

Every claim resolved to UNRESOLVED. No session dump matched any cited ID.

We added a second check: CATEGORY-MISMATCH. Claims describe conversations, decisions, findings — evidence types that require SESSION-class artifacts. The artifacts that actually exist for the cited dates are SPAWN trees, DELEGATION summaries, RECEIPTs, and BACKUPs. These are different artifact classes. A spawn tree proves work was dispatched; it does not contain the conversation. A delegation summary proves a subagent produced output; it does not contain the decision-maker's reasoning. A receipt proves system state at a time; it does not describe the work.

The mismatch is total: 28 claims, 28 category mismatches. Structural, not accidental.

## The fix — mechanical, not editorial

We did not fix the cluster by editing prose. We fixed it by building a pipeline.

**Step 1: Inventory.** The resolver walks every artifact class (session, spawn, delegation, receipt, backup) across every profile. It emits a machine-readable index: `{class, profile, id, path, size, mtime}`.

**Step 2: Resolve.** For each citation, the resolver parses `{class, profile, id, anchor}`, checks the artifact exists at the expected path, and emits RESOLVED / UNRESOLVED / CONTRADICTED.

**Step 3: Class-match.** For each claim, the resolver determines the minimum evidence class required. A claim that says "we discussed X" requires SESSION. A claim that says "we dispatched research on X" requires SPAWN. A claim that says "a subagent produced findings on X" requires DELEGATION. If the citation's class is below the requirement, flag as CATEGORY-MISMATCH.

**Step 4: Re-point.** For each UNRESOLVED or CATEGORY-MISMATCH claim, we searched the inventory for an artifact that could support it. Two paths:
- **Path A:** Rewrite as qualitative author-synthesis for pattern claims ("In governed agent systems, approval gates often exist in documentation but not in code"). Mark as `[Qualitative — pattern observed]`.
- **Path B:** Remove entirely for specific-event claims with no artifact support ("Finding 1 was fixed in session X").

Path A for general patterns. Path B for specific events.

**Step 5: Re-verification.** Re-ran the resolver against the re-pointed draft. Result: every claim now either grounded in a real `[Project: artifact/finding]` citation or marked `[Qualitative — pattern/convention]`. Zero residual session citations.

The pipeline is the fix. The edits are the output of the pipeline, not the fix itself.

## What this demonstrates

The pillar's thesis, applied to the pillar:

**Documentation governance:** The `@session` format existed. It looked correct. It was never checked. The citations sat in the document looking authoritative while pointing to nothing. This is documentation governance — the form of verification without the substance.

**Runtime governance:** The resolver checks at publish time. A citation that cannot resolve blocks publication. The check is mechanical, not editorial. It does not depend on the author remembering to verify. It is a gate.

**The fabrication was caught by exactly the discipline the pillar argues for — applied to the pillar itself.** The nine-piece cluster argues that governance must be enforced at execution time, not documented at review time. The audit enforced citation governance at publish time. The result: the cluster's own failure mode became the proof of its thesis.

We did not set out to fabricate evidence. We set out to build a content cluster, and we built a fabrication machine. The machine produced structurally valid citations that pointed to non-existent sessions. The only reason we caught it is that we built a tool to catch it — and we built that tool because the pillar says to build such tools.

This is not a story about AI safety. It is a story about what happens when you argue for runtime governance and then apply documentation governance to your own work. The gap between what we said and what we did is the gap the pillar describes. Closing that gap required not better intentions but better tools.

The re-pointed cluster is at `blog\drafts\governed-ai-execution-9-piece-cluster.repointed.md`. Every claim is grounded or marked qualitative. The resolver is at `blog\tools\resolve_citations.py`. The verification report is at `blog\drafts\citation-verification-report.md`.

---

**Tell me what you're building.**
**No pitch — just questions about your problem.**

[Contact → `/contact/`]

*(See also: the architectural discipline behind this — `/research/rag/`)*

*(See also: the foundational document this cluster builds on — `# Why PMOS Exists`, publishing first)*
