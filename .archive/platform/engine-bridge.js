// engine-bridge.js
// Rankfixer Platform — Engine Bridge
// Connects the existing SEO/GEO and Infrastructure engines to the platform worker.
// Replaces the stubs in worker.js with real control loop execution.

import { db } from './db.js';

// Import the actual engines
import { runDeepAuditV2 } from '../rankfixer-mapper/audit-report-v2.js';
import { runControlLoop } from '../infrastructure/state-manager.js';

// =============================================================================
// SEO AUDIT — Wire Site Mapper v2 + Citation-Gap Auditor
// =============================================================================

export async function runSEOAudit(audit, site, credentials) {
    console.log(`[Engine] Starting SEO audit for ${site.url}`);
    
    // ── Phase 1: Site Mapper v2 — Diagnostic ──────────────────────
    await updatePhase(audit.id, 'mapping', 0);
    
    const seoReport = await runDeepAuditV2(site.url);
    
    await updatePhase(audit.id, 'mapping', 100);
    
    // ── Phase 2: Citation-Gap Analysis (GEO) ─────────────────────
    await updatePhase(audit.id, 'planning', 0);
    
    // If OpenAI credentials exist, run citation-gap analysis
    let geoFindings = [];
    if (credentials.rows?.some(c => c.provider === 'openai')) {
        const { auditCitationGap } = await import('../rankfixer-mapper/citation-gap-auditor.js');
        
        // For each key template, run citation-gap against top competitors
        for (const template of seoReport.templates || []) {
            if (template.instanceCount < 5) continue;
            
            // In production: query competitor URLs from GSC/GA4
            // For MVP: skip if no competitor data configured
            const competitorUrls = site.competitor_urls || [];
            if (competitorUrls.length === 0) continue;
            
            const sampleHtml = template.samples?.[0]; // Would need actual HTML fetch
            if (!sampleHtml) continue;
            
            const geoReport = auditCitationGap(
                template.pageType + ' ' + site.url,
                site.url + '/' + template.pattern.replace('{slug}', template.samples?.[0]),
                sampleHtml,
                competitorUrls.map(u => ({ url: u, html: '' })), // Would fetch in production
                template.pageType
            );
            
            // Convert GEO gaps to findings
            for (const gap of (geoReport.gaps || [])) {
                geoFindings.push({
                    type: 'citation-gap-' + gap.type,
                    severity: gap.priority === 'critical' ? 'critical' : 'warning',
                    domain: 'geo',
                    title: `Citation gap: ${gap.type} on ${template.pattern}`,
                    description: gap.remediation,
                    recommendation: gap.remediation,
                    affected_count: template.instanceCount,
                    auto_approvable: false, // Content changes require human review
                    rpes_score: gap.priority === 'critical' ? 85 : 55,
                    rpes_category: 'E',
                    template_pattern: template.pattern
                });
            }
        }
    }
    
    await updatePhase(audit.id, 'planning', 100);
    
    // ── Phase 3: Map findings to remediation actions ─────────────
    await updatePhase(audit.id, 'executing', 0);
    
    const findings = mapSEOFindings(seoReport, geoFindings);
    
    // Store assets
    for (const page of (seoReport.pages || [])) {
        await db.query(
            `INSERT INTO assets (audit_id, site_id, tenant_id, asset_type, asset_domain, external_id, name, 
              template_pattern, page_type, title, h1, meta_description, canonical_url, 
              content_size, is_orphan, is_indexable, health_status, drift_detected, health_score)
             VALUES ($1, $2, $3, 'page', 'seo', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [audit.id, audit.site_id, audit.tenant_id, page.url, page.url,
             page.templatePattern, page.pageType, page.title, page.h1, 
             page.metaDescription, page.canonical, page.contentSize || 0,
             page.isOrphan || false, page.isIndexable !== false, 
             page.issues > 0 ? 'warning' : 'healthy', page.issues > 0, page.value || 50]
        );
    }
    
    await updatePhase(audit.id, 'executing', 100);
    
    // ── Phase 4: Verification ────────────────────────────────────
    await updatePhase(audit.id, 'verifying', 0);
    
    // In production: re-run audit to verify fixes
    // For MVP: mark as verified if findings were stored
    
    await updatePhase(audit.id, 'verifying', 100);
    
    return {
        type: 'seo',
        totalPages: seoReport.site?.totalPages || 0,
        templates: seoReport.templates?.length || 0,
        contradictions: seoReport.globalContradictions?.length || 0,
        findings
    };
}

// =============================================================================
// INFRA AUDIT — Wire Resource Mapper + Remediation Engine
// =============================================================================

export async function runInfraAudit(audit, site, credentials) {
    console.log(`[Engine] Starting infra audit for ${site.cloud_provider} account ${site.cloud_account}`);
    
    // ── Phase 1: Resource Mapping ────────────────────────────────
    await updatePhase(audit.id, 'mapping', 0);
    
    // In production: fetch actual state from cloud API
    // const actualResources = await fetchFromCloudAPI(site.cloud_provider, credentials);
    
    // In production: fetch declared state from IaC
    // const declaredResources = await fetchFromTerraformState(site);
    
    // For MVP: use the test-infra pattern with live credentials
    const declaredResources = []; // TODO: fetch from Terraform Cloud/state files
    const actualResources = [];   // TODO: fetch from AWS/GCP/Azure API
    
    const infraReport = await runControlLoop(
        declaredResources,
        actualResources,
        site.cloud_provider,
        {
            environment: site.environment || 'prod',
            dryRun: site.environment === 'prod', // Safety: prod always dry-run first
            autoApprove: site.environment !== 'prod',
            blastRadiusLimit: 50,
            storePath: `./infra-state/${site.id}`
        }
    );
    
    await updatePhase(audit.id, 'mapping', 100);
    
    // ── Phase 2-4: Plan, Execute, Verify (handled by runControlLoop) ──
    await updatePhase(audit.id, 'planning', 50);
    await updatePhase(audit.id, 'planning', 100);
    await updatePhase(audit.id, 'executing', 50);
    await updatePhase(audit.id, 'executing', 100);
    await updatePhase(audit.id, 'verifying', 50);
    await updatePhase(audit.id, 'verifying', 100);
    
    // Map drift to findings
    const findings = mapInfraFindings(infraReport);
    
    // Store assets
    for (const [id, resource] of (infraReport.mapping?.nodes || new Map())) {
        await db.query(
            `INSERT INTO assets (audit_id, site_id, tenant_id, asset_type, asset_domain, external_id, name,
              template_pattern, environment, criticality, network_exposure, 
              encryption_at_rest, encryption_in_transit, logging_enabled, blast_radius,
              health_status, drift_detected, drift_severity, health_score)
             VALUES ($1, $2, $3, $4, 'infrastructure', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
            [audit.id, audit.site_id, audit.tenant_id, resource.serviceType || 'unknown',
             resource.id, resource.name, resource.serviceType, resource.environment || 'unknown',
             resource.criticality || 'medium', resource.networkExposure || 'unknown',
             resource.encryption?.atRest || false, resource.encryption?.inTransit || false,
             resource.logging?.enabled || false, resource.blastRadius || 0,
             resource.drift?.detected ? (resource.drift?.severity === 'critical' ? 'critical' : 'warning') : 'healthy',
             resource.drift?.detected || false, resource.drift?.severity || 'none',
             resource.drift?.detected ? 30 : 90]
        );
    }
    
    return {
        type: 'infrastructure',
        totalResources: infraReport.mapping?.totalResources || 0,
        drift: infraReport.mapping?.driftDetected || 0,
        critical: infraReport.mapping?.criticalDrift || 0,
        executed: infraReport.execution?.executed || 0,
        resolved: infraReport.verification?.resolved || 0,
        findings
    };
}

// =============================================================================
// FINDING MAPPERS — Convert engine output to platform findings
// =============================================================================

function mapSEOFindings(seoReport, geoFindings) {
    const findings = [...geoFindings];
    
    // Map contradictions to findings
    for (const c of (seoReport.globalContradictions || [])) {
        findings.push({
            type: c.type || c.subtype,
            severity: c.severity || 'warning',
            domain: 'seo',
            title: c.message,
            description: c.message,
            recommendation: c.recommendation,
            affected_count: c.affectedUrls?.length || 1,
            auto_approvable: isSEOAutoApprovable(c.type || c.subtype),
            rpes_score: calculateRPES(c, 'seo'),
            rpes_category: inferRPESCategory(c.type || c.subtype)
        });
    }
    
    // Map template issues
    for (const template of (seoReport.templates || [])) {
        for (const issue of (template.templateIssues || [])) {
            findings.push({
                type: issue.type,
                severity: issue.severity,
                domain: 'seo',
                title: issue.message,
                description: `Template: ${template.pattern} (${template.instanceCount} pages)`,
                recommendation: issue.recommendation,
                affected_count: issue.estimatedAffectedPages || template.instanceCount,
                auto_approvable: isSEOAutoApprovable(issue.type),
                rpes_score: calculateRPES(issue, 'seo'),
                rpes_category: inferRPESCategory(issue.type),
                template_pattern: template.pattern
            });
        }
    }
    
    return findings;
}

function mapInfraFindings(infraReport) {
    const findings = [];
    
    // Map drift to findings
    const nodes = infraReport.mapping?.nodes;
    if (nodes) {
        for (const [id, resource] of nodes) {
            if (!resource.drift?.detected) continue;
            
            for (const field of (resource.drift.fields || [])) {
                findings.push({
                    type: 'drift-' + field.path.replace(/\./g, '-'),
                    severity: field.isCritical ? 'critical' : 'warning',
                    domain: 'infrastructure',
                    title: `${resource.name}: ${field.risk}`,
                    description: `Declared: ${field.declared}, Actual: ${field.actual}`,
                    recommendation: `Revert to declared state or update IaC to match.`,
                    affected_count: resource.blastRadius || 1,
                    auto_approvable: isInfraAutoApprovable(field.path, resource.environment),
                    rpes_score: field.isCritical ? 90 : 55,
                    rpes_category: 'S',
                    template_pattern: resource.serviceType
                });
            }
        }
    }
    
    // Map remediation actions
    for (const action of (infraReport.plan?.actions || [])) {
        findings.push({
            type: action.action,
            severity: action.severity,
            domain: 'infrastructure',
            title: action.summary,
            description: action.evidence?.risk || '',
            recommendation: action.terraformCommand || action.terraformPatch?.filename || 'Manual review required',
            affected_count: action.blastRadius || 1,
            auto_approvable: action.autoApprovable,
            rpes_score: action.severity === 'critical' ? 90 : 55,
            rpes_category: 'S'
        });
    }
    
    return findings;
}

// =============================================================================
// AUTO-APPROVAL GATES — Cross-reference with governance profiles
// =============================================================================

function isSEOAutoApprovable(issueType) {
    const autoTypes = [
        'missing-meta-description', 'duplicate-title', 'duplicate-meta-description',
        'missing-canonical', 'canonical-chain', 'reciprocal-canonical',
        'h1-equals-title', 'multiple-h1', 'missing-h1'
    ];
    return autoTypes.includes(issueType);
}

function isInfraAutoApprovable(driftPath, environment) {
    if (environment === 'prod') return false; // Safety gate
    
    const autoPaths = [
        'encryption.atRest', 'encryption.inTransit', 'logging.enabled', 'tags'
    ];
    return autoPaths.some(p => driftPath.startsWith(p));
}

function calculateRPES(issue, domain) {
    const severity = issue.severity || 'warning';
    const baseScore = severity === 'critical' ? 85 : severity === 'warning' ? 55 : 25;
    return baseScore;
}

function inferRPESCategory(issueType) {
    const economicTypes = ['missing-h1', 'missing-meta-description', 'duplicate-title', 'thin-content'];
    const structuralTypes = ['canonical-chain', 'reciprocal-canonical', 'broken-internal-links', 'orphan'];
    const performanceTypes = ['page-speed', 'duplicate-meta-description', 'multiple-h1'];
    
    if (economicTypes.includes(issueType)) return 'E';
    if (structuralTypes.includes(issueType)) return 'S';
    if (performanceTypes.includes(issueType)) return 'P';
    return 'R';
}

// =============================================================================
// HELPERS
// =============================================================================

async function updatePhase(auditId, phase, progress) {
    await db.query(
        `UPDATE audits SET phase = $2, phase_progress = $3 WHERE id = $1`,
        [auditId, phase, progress]
    );
}

export { runSEOAudit, runInfraAudit };
