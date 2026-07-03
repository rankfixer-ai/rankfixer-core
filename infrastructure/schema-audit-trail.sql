-- =============================================================================
-- AUDIT TRAIL SCHEMA
-- Stores every mutation applied by Hermes for full traceability.
-- Supports rollback, impact analysis, and compliance reporting.
-- =============================================================================

-- =============================================================================
-- TABLE: audit_trail
-- Immutable log of every mutation applied to any page.
-- Never UPDATE or DELETE from this table — only INSERT.
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_trail (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ── Finding Reference ──────────────────────────────────────────
    audit_id        VARCHAR(255) NOT NULL,          -- Links to audits table
    finding_id      VARCHAR(255) NOT NULL,          -- Links to findings table
    auto_fix_job_id VARCHAR(255),                   -- Links to auto_fix_queue
    
    -- ── Target Context ────────────────────────────────────────────
    page_url        TEXT NOT NULL,                   -- URL that was mutated
    template_pattern VARCHAR(500),                  -- Template pattern (for grouping)
    issue_type      VARCHAR(100) NOT NULL,          -- missing-h1, duplicate-title, etc.
    
    -- ── Mutation Details ──────────────────────────────────────────
    mutation_action VARCHAR(100) NOT NULL,          -- add_element, update_meta_tag, etc.
    mutation_instruction JSONB NOT NULL,            -- Full instruction from buildFixInstruction()
    
    -- ── State Snapshots ───────────────────────────────────────────
    before_state    JSONB NOT NULL,                 -- captureBeforeState() output
    after_state     JSONB NOT NULL,                 -- captureAfterState() output
    state_diff      JSONB,                          -- Computed diff between before/after
    
    -- ── Execution Metadata ────────────────────────────────────────
    executed_by     VARCHAR(100) DEFAULT 'hermes',  -- hermes, manual, rollback
    execution_time_ms INTEGER,                     -- How long the mutation took
    dry_run         BOOLEAN DEFAULT FALSE,          -- Was this a dry run?
    
    -- ── Rollback Support ──────────────────────────────────────────
    is_rolled_back  BOOLEAN DEFAULT FALSE,          -- Has this mutation been rolled back?
    rolled_back_at  TIMESTAMPTZ,                    -- When rollback occurred
    rollback_trail_id UUID,                         -- Links to the rollback audit_trail entry
    rollback_reason TEXT,                           -- Why rollback was triggered
    
    -- ── Impact Metrics (populated post-mutation) ──────────────────
    performance_impact JSONB,                       -- { lcp_before, lcp_after, cls_before, cls_after }
    seo_impact       JSONB,                         -- { ranking_change, traffic_change, indexability_change }
    
    -- ── Verification ──────────────────────────────────────────────
    pre_flight_verified  BOOLEAN DEFAULT FALSE,     -- Did preFlightVerify pass?
    post_flight_verified BOOLEAN,                   -- Did post-mutation verify pass?
    verification_details JSONB,                     -- ValidationEngine output
    
    -- ── Timestamps ────────────────────────────────────────────────
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- ── Indexes ───────────────────────────────────────────────────
    CONSTRAINT fk_audit_trail_audit FOREIGN KEY (audit_id) REFERENCES audits(audit_id),
    CONSTRAINT fk_audit_trail_rollback FOREIGN KEY (rollback_trail_id) REFERENCES audit_trail(id)
);

-- Indexes for common queries
CREATE INDEX idx_audit_trail_audit_id ON audit_trail(audit_id);
CREATE INDEX idx_audit_trail_finding_id ON audit_trail(finding_id);
CREATE INDEX idx_audit_trail_page_url ON audit_trail(page_url);
CREATE INDEX idx_audit_trail_template ON audit_trail(template_pattern);
CREATE INDEX idx_audit_trail_issue_type ON audit_trail(issue_type);
CREATE INDEX idx_audit_trail_rolled_back ON audit_trail(is_rolled_back) WHERE is_rolled_back = TRUE;
CREATE INDEX idx_audit_trail_created_at ON audit_trail(created_at DESC);

-- =============================================================================
-- TABLE: auto_fix_queue (updated with audit_trail reference)
-- =============================================================================
CREATE TABLE IF NOT EXISTS auto_fix_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ── Finding Reference ──────────────────────────────────────────
    finding_id      VARCHAR(255) NOT NULL,
    audit_id        VARCHAR(255) NOT NULL,
    template_pattern VARCHAR(500),
    issue_type      VARCHAR(100) NOT NULL,
    
    -- ── Fix Details ────────────────────────────────────────────────
    target_url      TEXT NOT NULL,                   -- URL to apply fix to
    fix_instruction JSONB NOT NULL,                  -- From buildFixInstruction()
    rpes_score      INTEGER NOT NULL,               -- Priority score
    
    -- ── Status Tracking ───────────────────────────────────────────
    status          VARCHAR(50) NOT NULL DEFAULT 'queued',
        -- queued: waiting for worker
        -- in_progress: worker picked it up
        -- pre_flight_failed: context verification failed
        -- applied: successfully applied
        -- resolved_externally: issue was already fixed
        -- failed: mutation failed
        -- rolled_back: was applied then reverted
        -- error: unexpected error
    
    -- ── Execution Metadata ────────────────────────────────────────
    worker_id       VARCHAR(100),                   -- Which Hermes worker processed this
    attempt_count   INTEGER DEFAULT 0,              -- Number of execution attempts
    max_attempts    INTEGER DEFAULT 3,              -- Max retries before marking failed
    last_error      TEXT,                           -- Most recent error message
    execution_log   JSONB,                          -- Full execution history
    
    -- ── Audit Trail Link ──────────────────────────────────────────
    audit_trail_id  UUID,                           -- Links to audit_trail after execution
    
    -- ── Timestamps ────────────────────────────────────────────────
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    executed_at     TIMESTAMPTZ,
    
    CONSTRAINT fk_auto_fix_audit FOREIGN KEY (audit_id) REFERENCES audits(audit_id),
    CONSTRAINT fk_auto_fix_trail FOREIGN KEY (audit_trail_id) REFERENCES audit_trail(id)
);

CREATE INDEX idx_auto_fix_status ON auto_fix_queue(status);
CREATE INDEX idx_auto_fix_created ON auto_fix_queue(created_at);
CREATE INDEX idx_auto_fix_audit ON auto_fix_queue(audit_id);

-- =============================================================================
-- TABLE: rollback_log
-- Tracks all rollback operations for compliance and pattern analysis.
-- =============================================================================
CREATE TABLE IF NOT EXISTS rollback_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- ── Rollback Details ──────────────────────────────────────────
    audit_trail_id  UUID NOT NULL,                  -- The mutation being rolled back
    auto_fix_job_id UUID,                           -- The job that triggered the original fix
    rolled_back_by  VARCHAR(100) NOT NULL,          -- hermes, manual, automated-threshold
    
    -- ── Reason ────────────────────────────────────────────────────
    trigger_reason  TEXT NOT NULL,                  -- Why rollback was initiated
    trigger_type    VARCHAR(50) NOT NULL,           -- performance_regression, manual, seo_drop, error
    
    -- ── Metrics That Triggered Rollback ───────────────────────────
    pre_fix_metrics  JSONB,                         -- Performance before original fix
    post_fix_metrics JSONB,                         -- Performance after fix (before rollback)
    threshold_breach JSONB,                         -- Which thresholds were exceeded
    
    -- ── Rollback Result ──────────────────────────────────────────
    rollback_success BOOLEAN NOT NULL,              -- Did rollback succeed?
    rollback_state   JSONB,                         -- State after rollback
    
    -- ── New audit_trail entry for the rollback itself ─────────────
    rollback_trail_id UUID,                         -- The audit_trail entry for this rollback
    
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_rollback_trail FOREIGN KEY (audit_trail_id) REFERENCES audit_trail(id),
    CONSTRAINT fk_rollback_new_trail FOREIGN KEY (rollback_trail_id) REFERENCES audit_trail(id)
);

CREATE INDEX idx_rollback_trail ON rollback_log(audit_trail_id);
CREATE INDEX idx_rollback_trigger ON rollback_log(trigger_type);
CREATE INDEX idx_rollback_created ON rollback_log(created_at DESC);

-- =============================================================================
-- VIEW: mutation_summary
-- Aggregated view for dashboard reporting.
-- =============================================================================
CREATE OR REPLACE VIEW mutation_summary AS
SELECT
    DATE_TRUNC('day', created_at) AS day,
    mutation_action,
    issue_type,
    COUNT(*) AS total_mutations,
    COUNT(*) FILTER (WHERE is_rolled_back = TRUE) AS rollbacks,
    COUNT(*) FILTER (WHERE post_flight_verified = TRUE) AS verified_successful,
    COUNT(*) FILTER (WHERE dry_run = TRUE) AS dry_runs,
    AVG(execution_time_ms) AS avg_execution_ms,
    ROUND(
        COUNT(*) FILTER (WHERE is_rolled_back = TRUE)::NUMERIC / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) AS rollback_rate_pct
FROM audit_trail
GROUP BY day, mutation_action, issue_type
ORDER BY day DESC, total_mutations DESC;

-- =============================================================================
-- VIEW: finding_impact
-- Tracks whether mutations improved or degraded the target issue.
-- =============================================================================
CREATE OR REPLACE VIEW finding_impact AS
SELECT
    at.issue_type,
    at.template_pattern,
    COUNT(*) AS times_fixed,
    COUNT(*) FILTER (WHERE at.is_rolled_back = TRUE) AS times_rolled_back,
    COUNT(*) FILTER (WHERE at.post_flight_verified = TRUE AND at.is_rolled_back = FALSE) AS successful_fixes,
    ROUND(
        COUNT(*) FILTER (WHERE at.post_flight_verified = TRUE AND at.is_rolled_back = FALSE)::NUMERIC / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) AS success_rate_pct
FROM audit_trail at
GROUP BY at.issue_type, at.template_pattern
ORDER BY times_fixed DESC;
