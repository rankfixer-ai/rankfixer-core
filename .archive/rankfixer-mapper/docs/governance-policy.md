# Governance Policy
- **Confidence**: RPES ≥ 80 for autonomous action, classification ≥ 70%
- **Reversibility**: beforeState must be fully captured and restorable
- **Idempotency**: Check existing state before applying, never duplicate
- **Scope**: Template-level only (≥ 5 pages), except cart/checkout
- **Economic Priority**: checkout > cart > product > category > homepage
