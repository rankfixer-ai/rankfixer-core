# Architecture Overview: Rankfixer v2
Rankfixer is a closed-loop, autonomous SEO remediation platform operating in four layers:
1. **Diagnostic**: Site Mapper v2 — template-aware sampling and contradiction detection.
2. **Decision**: Rankfixer Bridge — RPES scoring with GOVERNANCE.md gating.
3. **Execution**: Hermes worker — surgical, idempotent DOM mutations.
4. **Observability**: Immutable audit_trail — verified, logged, reversible, measurable.
