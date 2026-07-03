-- =============================================================================
-- RANKFIXER PLATFORM — PostgreSQL Schema
-- Multi-tenant SaaS database for SEO/GEO + Infrastructure control planes.
-- Replaces file-based StateStore with queryable, relational persistence.
-- =============================================================================

-- =============================================================================
-- TENANTS & USERS
-- =============================================================================

CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    plan            VARCHAR(50) DEFAULT 'free',  -- free, pro, enterprise
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    name            VARCHAR(255),
    role            VARCHAR(50) DEFAULT 'member',  -- owner, admin, member, viewer
    auth_provider   VARCHAR(50),                   -- google, github, email
    auth_id         VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login      TIMESTAMPTZ,
    UNIQUE(tenant_id, email)
);

-- =============================================================================
-- CREDENTIALS (encrypted at rest)
-- =============================================================================

CREATE TABLE credentials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider        VARCHAR(50) NOT NULL,          -- aws, gcp, azure, gsc, ga4, openai
    credential_type VARCHAR(50) NOT NULL,          -- api_key, oauth_token, service_account
    encrypted_data  TEXT NOT NULL,                 -- AES-256 encrypted JSON
    scopes          TEXT[],                        -- Permissions granted
    is_active       BOOLEAN DEFAULT TRUE,
    last_validated  TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- SITES / PROJECTS (what's being audited)
-- =============================================================================

CREATE TABLE sites (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    url             TEXT,                           -- For SEO sites
    cloud_provider  VARCHAR(50),                   -- aws, gcp, azure (for infra)
    cloud_account   VARCHAR(255),                  -- Account ID / Project ID
    environment     VARCHAR(50) DEFAULT 'production',  -- prod, staging, dev
    governance_profile VARCHAR(50) DEFAULT 'standard', -- standard, strict, pci, hipaa
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- AUDITS (each run of the control loop)
-- =============================================================================

CREATE TABLE audits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    audit_type      VARCHAR(50) NOT NULL,          -- seo, infrastructure, full
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',
        -- pending, in_progress, mapping, planning, executing, verifying, completed, failed
    trigger         VARCHAR(50) DEFAULT 'manual',  -- manual, scheduled, webhook
    health_score    INTEGER,                       -- 0-100
    duration_ms     INTEGER,
    
    -- Summary counts (populated after completion)
    total_assets        INTEGER DEFAULT 0,
    critical_issues     INTEGER DEFAULT 0,
    warning_issues      INTEGER DEFAULT 0,
    auto_fixed          INTEGER DEFAULT 0,
    needs_approval      INTEGER DEFAULT 0,
    resolved_since_last INTEGER DEFAULT 0,
    
    -- Full report
    report_json     JSONB,
    
    -- State
    phase           VARCHAR(50),                   -- Current phase of control loop
    phase_progress  INTEGER DEFAULT 0,             -- 0-100 within current phase
    error_message   TEXT,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_audits_site ON audits(site_id);
CREATE INDEX idx_audits_tenant ON audits(tenant_id);
CREATE INDEX idx_audits_status ON audits(status);
CREATE INDEX idx_audits_created ON audits(created_at DESC);

-- =============================================================================
-- ASSETS (individual resources/pages discovered during audit)
-- =============================================================================

CREATE TABLE assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id        UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Identity
    asset_type      VARCHAR(50) NOT NULL,          -- page, ec2_instance, s3_bucket, iam_role, etc.
    asset_domain    VARCHAR(50) NOT NULL,          -- seo, infrastructure
    external_id     TEXT NOT NULL,                 -- URL, ARN, resource ID
    name            VARCHAR(500),
    environment     VARCHAR(50),
    criticality     VARCHAR(50) DEFAULT 'medium',  -- critical, high, medium, low
    
    -- Classification (template/pattern grouping)
    template_pattern TEXT,                         -- /products/{slug}, aws_instance.{name}, etc.
    page_type       VARCHAR(100),                  -- product, article, checkout, ec2, s3, rds
    
    -- State comparison
    declared_state  JSONB,                         -- From IaC / expected SEO state
    actual_state    JSONB,                         -- From Cloud API / actual crawl
    
    -- Health
    health_status   VARCHAR(50) DEFAULT 'unknown', -- healthy, warning, critical
    drift_detected  BOOLEAN DEFAULT FALSE,
    drift_severity  VARCHAR(50),                   -- critical, warning, info, none
    drift_fields    JSONB,                         -- Array of drifted field details
    
    -- SEO-specific
    title           TEXT,
    h1              TEXT,
    meta_description TEXT,
    canonical_url   TEXT,
    meta_robots     VARCHAR(100),
    schema_types    TEXT[],
    content_size    INTEGER,
    inlinks_count   INTEGER DEFAULT 0,
    is_orphan       BOOLEAN DEFAULT FALSE,
    is_indexable    BOOLEAN DEFAULT TRUE,
    
    -- Infrastructure-specific
    network_exposure VARCHAR(50),                  -- public, private, vpc, isolated
    encryption_at_rest    BOOLEAN,
    encryption_in_transit BOOLEAN,
    logging_enabled       BOOLEAN,
    blast_radius    INTEGER DEFAULT 0,
    
    -- Scores
    health_score    INTEGER,                       -- Per-asset health score 0-100
    cws_score       FLOAT,                         -- Citation-worthiness (SEO/GEO)
    rpes_score      INTEGER,                       -- RPES priority score
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assets_audit ON assets(audit_id);
CREATE INDEX idx_assets_site ON assets(site_id);
CREATE INDEX idx_assets_type ON assets(asset_type);
CREATE INDEX idx_assets_health ON assets(health_status);
CREATE INDEX idx_assets_template ON assets(template_pattern);

-- =============================================================================
-- FINDINGS / ISSUES (contradictions detected)
-- =============================================================================

CREATE TABLE findings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id        UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    asset_id        UUID REFERENCES assets(id) ON DELETE SET NULL,
    site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Finding identity
    finding_type    VARCHAR(100) NOT NULL,         -- missing-h1, public-s3, overly-permissive-iam
    severity        VARCHAR(50) NOT NULL,          -- critical, warning, info
    domain          VARCHAR(50) NOT NULL,          -- seo, infrastructure
    
    -- Description
    title           TEXT NOT NULL,
    description     TEXT,
    recommendation  TEXT,
    
    -- Scope
    template_pattern TEXT,                         -- Group findings by template
    affected_count  INTEGER DEFAULT 1,             -- Number of assets affected
    affected_assets JSONB,                         -- Array of asset IDs
    
    -- Scoring
    rpes_score      INTEGER,
    rpes_category   VARCHAR(1),                    -- R, P, E, S
    auto_approvable BOOLEAN DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT TRUE,
    
    -- State
    status          VARCHAR(50) DEFAULT 'open',    -- open, auto_fixed, approved, rejected, fixed, verified
    fixed_at        TIMESTAMPTZ,
    verified_at     TIMESTAMPTZ,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_findings_audit ON findings(audit_id);
CREATE INDEX idx_findings_asset ON findings(asset_id);
CREATE INDEX idx_findings_status ON findings(status);
CREATE INDEX idx_findings_severity ON findings(severity);

-- =============================================================================
-- REMEDIATION ACTIONS (fixes applied or queued)
-- =============================================================================

CREATE TABLE remediation_actions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finding_id      UUID REFERENCES findings(id) ON DELETE SET NULL,
    audit_id        UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Action details
    action_type     VARCHAR(100) NOT NULL,         -- update_tf_resource, block_public_access, add_meta_tag
    summary         TEXT NOT NULL,
    severity        VARCHAR(50),
    blast_radius    INTEGER DEFAULT 0,
    
    -- Fix instructions
    fix_instruction JSONB,                         -- The actual patch/mutation to apply
    terraform_patch TEXT,                          -- HCL patch for infra
    rollback_plan   JSONB,                         -- How to undo
    
    -- Gates
    auto_approvable BOOLEAN DEFAULT FALSE,
    requires_manual_review BOOLEAN DEFAULT TRUE,
    
    -- State machine
    status          VARCHAR(50) DEFAULT 'pending',
        -- pending, in_progress, verifying, resolved, failed, deferred, rolled_back, skipped
    state_history   JSONB DEFAULT '[]',            -- Array of state transitions
    
    -- Execution
    executed_at     TIMESTAMPTZ,
    verified_at     TIMESTAMPTZ,
    error_message   TEXT,
    
    -- Evidence
    before_state    JSONB,
    after_state     JSONB,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_remediation_finding ON remediation_actions(finding_id);
CREATE INDEX idx_remediation_audit ON remediation_actions(audit_id);
CREATE INDEX idx_remediation_status ON remediation_actions(status);

-- =============================================================================
-- AUDIT SCHEDULES (recurring audits)
-- =============================================================================

CREATE TABLE audit_schedules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id         UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    audit_type      VARCHAR(50) NOT NULL,          -- seo, infrastructure, full
    frequency       VARCHAR(50) NOT NULL,          -- hourly, daily, weekly, monthly
    cron_expression VARCHAR(100),                  -- For custom schedules
    is_active       BOOLEAN DEFAULT TRUE,
    
    last_run_at     TIMESTAMPTZ,
    next_run_at     TIMESTAMPTZ,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- GOVERNANCE PROFILES (per-tenant customization)
-- =============================================================================

CREATE TABLE governance_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    
    -- Override default thresholds
    auto_fix_enabled        BOOLEAN DEFAULT TRUE,
    auto_fix_min_score      INTEGER DEFAULT 80,
    blast_radius_max        INTEGER DEFAULT 50,
    
    -- Domain-specific toggles
    seo_auto_fix_titles         BOOLEAN DEFAULT TRUE,
    seo_auto_fix_meta           BOOLEAN DEFAULT TRUE,
    seo_auto_fix_canonical      BOOLEAN DEFAULT TRUE,
    infra_auto_block_public     BOOLEAN DEFAULT TRUE,
    infra_auto_enable_encryption BOOLEAN DEFAULT TRUE,
    infra_auto_enable_logging   BOOLEAN DEFAULT TRUE,
    
    -- Environment rules
    prod_requires_approval      BOOLEAN DEFAULT TRUE,
    staging_requires_approval   BOOLEAN DEFAULT FALSE,
    dev_requires_approval       BOOLEAN DEFAULT FALSE,
    
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- =============================================================================
-- API KEYS (for programmatic access)
-- =============================================================================

CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    key_hash        TEXT NOT NULL,
    key_prefix      VARCHAR(10) NOT NULL,           -- For UI display: "rk_live_ab..."
    scopes          TEXT[],
    is_active       BOOLEAN DEFAULT TRUE,
    last_used_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- VIEWS — Dashboard-ready queries
-- =============================================================================

-- Tenant health overview
CREATE VIEW tenant_health AS
SELECT
    t.id AS tenant_id,
    t.name AS tenant_name,
    COUNT(DISTINCT s.id) AS site_count,
    COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed') AS audits_completed,
    COALESCE(AVG(a.health_score) FILTER (WHERE a.status = 'completed'), 0) AS avg_health_score,
    COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'open' AND f.severity = 'critical') AS open_critical,
    COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'open') AS open_findings,
    COUNT(DISTINCT ra.id) FILTER (WHERE ra.status = 'pending') AS pending_actions,
    COUNT(DISTINCT ra.id) FILTER (WHERE ra.status = 'resolved') AS resolved_actions
FROM tenants t
LEFT JOIN sites s ON s.tenant_id = t.id
LEFT JOIN audits a ON a.site_id = s.id
LEFT JOIN findings f ON f.audit_id = a.id
LEFT JOIN remediation_actions ra ON ra.audit_id = a.id
GROUP BY t.id, t.name;

-- Site health trend
CREATE VIEW site_health_trend AS
SELECT
    site_id,
    DATE_TRUNC('day', completed_at) AS audit_day,
    AVG(health_score) AS avg_health,
    SUM(critical_issues) AS total_critical,
    SUM(auto_fixed) AS total_auto_fixed,
    SUM(needs_approval) AS total_needs_approval
FROM audits
WHERE status = 'completed'
GROUP BY site_id, DATE_TRUNC('day', completed_at)
ORDER BY site_id, audit_day DESC;

-- Finding impact summary
CREATE VIEW finding_impact AS
SELECT
    finding_type,
    domain,
    COUNT(*) AS total_found,
    COUNT(*) FILTER (WHERE status = 'auto_fixed' OR status = 'fixed') AS total_resolved,
    ROUND(AVG(rpes_score)) AS avg_priority,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'auto_fixed' OR status = 'fixed')::NUMERIC / 
        NULLIF(COUNT(*), 0) * 100, 1
    ) AS resolution_rate_pct
FROM findings
GROUP BY finding_type, domain
ORDER BY total_found DESC;
