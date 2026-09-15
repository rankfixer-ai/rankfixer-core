# Operational Playbook
## Deployment
1. Apply database migrations from `schema-audit-trail.sql`
2. Start Hermes worker: `runHermes()`
3. Wire `bridgeAuditResults()` into `POST /api/audit/site`
## Rollback
1. Identify `audit_trail_id` from affected window
2. Call `rollbackMutation(url, instruction, beforeState)`
3. System restores state and logs to `rollback_log`
## Monitoring
- `mutation_summary` view daily
- `finding_impact` view weekly
- Alert if rollback rate > 5%
