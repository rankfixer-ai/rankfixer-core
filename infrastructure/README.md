# Infrastructure Control Plane

Self-healing infrastructure controller. Compares declared state (IaC) against actual reality (Cloud API), detects drift, generates remediation plans with safety gates, and verifies fixes.

## Modules
- `resource-mapper.js` — Normalize IaC + Cloud API into universal ResourceNodes, detect drift
- `remediation-engine.js` — Generate Terraform patches from drift, execute with blast-radius safety
- `state-manager.js` — Persist state, verify fixes, checkpoint/resume, audit trail
- `test-infra.js` — Dry run against simulated AWS environment with 6 drift scenarios

## Run
```bash
node test-infra.js
