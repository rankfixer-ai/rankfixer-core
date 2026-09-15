// rankfixer-bridge.js
// Site Mapper v2 → Rankfixer Backend Bridge
// Maps v2 audit reports to existing findings schema,
// applies RPES governance, and queues auto-fixes for Hermes.

// =============================================================================
// CONFIGURATION — Adjust these to match your existing DB schema
// =============================================================================

const FINDINGS_TABLE = 'findings';           // Your findings table name
const AUTO_FIX_QUEUE = 'auto_fix_queue';     // Hermes worker queue table
const AUDITS_TABLE = 'audits';              // Your audits table name

// Column mapping: v2 field → your DB column name
const COLUMN_MAP = {
    auditId: 'audit_id',
    templatePattern: 'template_pattern',
    issueType: 'finding_type',
    severity: 'severity',
    instanceCount: 'template_instance_count',
    extrapolatedImpact: 'estimated_affected_pages',
    confidence: 'classification_confidence',
    sampleCount: 'samples_crawled',
    sampleUrls: 'sample_urls',
    rpesScore: 'rpes_score',
    rpesCategory: 'rpes_category',
    action: 'action_status',
    recommendation: 'recommendation',
    evidence: 'evidence',
    autoFixable: 'is_auto_fixable',
    autoFixConfidence: 'auto_fix_confidence',
    appliedFix: 'fix_applied',
    fixTimestamp: 'fix_applied_at'
};

// =============================================================================
// MAIN BRIDGE FUNCTION
// =============================================================================

/**
 * Bridge a Site Mapper v2 audit report into the Rankfixer backend.
 * 
 * @param {string} auditId - The audit execution ID
 * @param {object} v2Report - Full output from runDeepAuditV2()
 * @param {object} options - { dryRun: boolean, autoFix: boolean }
 * @returns {object} { findingsCreated, fixesQueued, skipped }
 */
export async function bridgeAuditResults(auditId, v2Report, options = {}) {
    const { dryRun = false, autoFix = false } = options;
    
    console.log(`[Bridge] Processing v2 report for audit ${auditId}...`);
    console.log(`[Bridge] ${v2Report.templates.length} templates, ${v2Report.globalContradictions.length} global contradictions`);
    
    const stats = {
        findingsCreated: 0,
        fixesQueued: 0,
        skipped: 0,
        verified: 0,
        failedVerification: 0
    };

    // =========================================================================
    // STEP 1: Store the audit record
    // =========================================================================
    if (!dryRun) {
        await db(AUDITS_TABLE).insert({
            audit_id: auditId,
            entry_url: v2Report.meta.entryUrl,
            site_archetype: v2Report.site.archetype,
            total_pages: v2Report.site.totalPages,
            templates_discovered: v2Report.site.templatesDiscovered,
            pages_sampled: v2Report.site.pagesSampled,
            duration: v2Report.meta.duration,
            report_json: JSON.stringify(v2Report),
            created_at: new Date().toISOString()
        });
    }

    // =========================================================================
    // STEP 2: Process template-level findings
    // =========================================================================
    for (const template of v2Report.templates) {
        const allIssues = [...template.templateIssues, ...template.pageIssues];
        
        for (const issue of allIssues) {
            
            // 2a. Calculate RPES score using GOVERNANCE.md weights
            const rpes = calculateRPES(issue, template, v2Report.site.archetype);
            
            // 2b. Determine governance action
            const action = getGovernanceAction(rpes, issue);
            
            // 2c. Pre-flight verification for auto-fix candidates
            let verified = true;
            if (action === 'autonomous' && autoFix) {
                verified = await preFlightVerify(issue, template);
                if (!verified) {
                    console.warn(`[Bridge] Verification failed: ${issue.type} on ${template.pattern}`);
                    stats.failedVerification++;
                } else {
                    stats.verified++;
                }
            }
            
            // 2d. Map to findings schema
            const findingRecord = mapToFindingsSchema(auditId, template, issue, rpes, action, verified);
            
            // 2e. Persist
            if (!dryRun) {
                await db(FINDINGS_TABLE).insert(findingRecord);
                stats.findingsCreated++;
            }
            
            // 2f. Queue auto-fix if autonomous + verified + autoFix enabled
            if (action === 'autonomous' && verified && autoFix && !dryRun) {
                await queueAutoFix(findingRecord, issue, template);
                stats.fixesQueued++;
            }
            
            if (action !== 'autonomous' && !verified) {
                stats.skipped++;
            }
        }
    }

    // =========================================================================
    // STEP 3: Process global contradictions
    // =========================================================================
    for (const contradiction of v2Report.globalContradictions) {
        const rpes = calculateRPESForGlobal(contradiction, v2Report.site.archetype);
        const action = getGovernanceAction(rpes, contradiction);
        
        if (!dryRun) {
            await db(FINDINGS_TABLE).insert({
                audit_id: auditId,
                template_pattern: null,
                finding_type: contradiction.type,
                severity: contradiction.severity,
                template_instance_count: null,
                estimated_affected_pages: contradiction.affectedUrls?.length || 1,
                rpes_score: rpes.score,
                rpes_category: rpes.category,
                action_status: action,
                recommendation: contradiction.recommendation,
                evidence: JSON.stringify({ affectedUrls: contradiction.affectedUrls }),
                is_auto_fixable: false,
                created_at: new Date().toISOString()
            });
            stats.findingsCreated++;
        }
    }

    console.log(`[Bridge] Complete: ${stats.findingsCreated} findings, ${stats.fixesQueued} fixes queued, ${stats.skipped} skipped`);
    return stats;
}

// =============================================================================
// RPES SCORING — Exact weights from GOVERNANCE.md
// =============================================================================

/**
 * Calculate RPES composite score for a finding.
 * 
 * RPES_Score = (R × 0.15) + (P × 0.15) + (E × 0.50) + (S × 0.20)
 * 
 * @returns { score: number (0-100), category: 'R'|'P'|'E'|'S' }
 */
export function calculateRPES(issue, template, siteArchetype) {
    let R = 0;  // Research — data integrity
    let P = 0;  // Performance — system speed
    let E = 0;  // Economic — revenue impact
    let S = 0;  // Structural — authority flow

    const severity = issue.severity || 'warning';
    const type = issue.type || issue.subtype || '';
    const pageType = template.pageType || 'unknown';
    const confidence = parseConfidence(issue.confidence || template.classificationConfidence || 'medium');
    const affectedPages = issue.estimatedAffectedPages || template.instanceCount || 1;

    // ── Research (R): Data quality and classification confidence ──
    if (confidence < 0.7) R += 30;
    if (confidence < 0.5) R += 40;
    if (confidence >= 0.9) R += 10;  // High confidence findings are valuable research

    // ── Performance (P): Crawl efficiency and system impact ──
    if (type === 'duplicate-title' || type === 'duplicate-meta-description') P += 20;
    if (type === 'canonical-chain' || type === 'reciprocal-canonical') P += 25;
    if (type === 'broken-internal-links') P += 40;
    if (affectedPages > 100) P += 20;  // Large blast radius = performance concern

    // ── Economic (E): Revenue and conversion impact ──
    // Template-type priority overrides from GOVERNANCE.md
    if (pageType === 'checkout' || pageType === 'cart') {
        E = 100;  // Absolute priority
    } else if (pageType === 'product') {
        E = 90;
    } else if (pageType === 'category') {
        E = 60;
    } else if (pageType === 'homepage') {
        E = 50;
    }
    
    // Issue-type economic signals
    if (type === 'missing-h1' && (pageType === 'product' || pageType === 'category')) E = Math.max(E, 70);
    if (type === 'missing-meta-description' && pageType === 'product') E = Math.max(E, 60);
    if (type === 'thin-content' && pageType === 'product') E = Math.max(E, 80);
    if (type === 'duplicate-title' && pageType === 'product') E = Math.max(E, 75);
    if (affectedPages > 500) E = Math.max(E, 70);  // Large-scale issues have economic impact

    // ── Structural (S): Internal authority and link equity ──
    if (pageType === 'homepage') S = Math.max(S, 90);
    if (pageType === 'category') S = Math.max(S, 80);
    if (type === 'canonical-chain' || type === 'reciprocal-canonical') S = Math.max(S, 70);
    if (type === 'missing-h1') S += 30;
    if (type === 'duplicate-title') S += 25;
    if (type === 'missing-meta-description') S += 15;
    if (type === 'thin-content') S += 20;
    if (type === 'broken-internal-links') S = Math.max(S, 60);

    // ── Severity multiplier ──
    const severityMultiplier = severity === 'critical' ? 1.0 : 
                                severity === 'warning' ? 0.7 : 
                                severity === 'info' ? 0.4 : 0.2;

    // ── Composite score ──
    const rawScore = (R * 0.15) + (P * 0.15) + (E * 0.50) + (S * 0.20);
    const score = Math.round(rawScore * severityMultiplier);

    // ── Primary category ──
    const scores = { R, P, E, S };
    const primaryCategory = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];

    return { score: Math.min(100, score), category: primaryCategory, breakdown: { R, P, E, S } };
}

function calculateRPESForGlobal(contradiction, siteArchetype) {
    // Simplified RPES for global contradictions (no template context)
    const severity = contradiction.severity || 'warning';
    const E = siteArchetype === 'ecommerce' ? 60 : 30;
    const S = 40;
    const P = 20;
    const R = 10;
    const mult = severity === 'critical' ? 1.0 : severity === 'warning' ? 0.7 : 0.4;
    const score = Math.round(((R * 0.15) + (P * 0.15) + (E * 0.50) + (S * 0.20)) * mult);
    return { score: Math.min(100, score), category: 'S', breakdown: { R, P, E, S } };
}

// =============================================================================
// GOVERNANCE GATING — From GOVERNANCE.md
// =============================================================================

/**
 * Determine the governance action for a finding.
 * 
 * Thresholds from GOVERNANCE.md:
 *   ≥ 80: Autonomous fix (Hermes executes immediately)
 *   50-79: Recommend fix (Dashboard notification)
 *   25-49: Log and monitor
 *   < 25: Research insight only
 */
function getGovernanceAction(rpes, issue) {
    const score = rpes.score;
    const type = issue.type || issue.subtype || '';
    
    if (score >= 80 && isAutoFixable(type)) {
        return 'autonomous';
    } else if (score >= 50) {
        return 'recommend';
    } else if (score >= 25) {
        return 'monitor';
    } else {
        return 'log';
    }
}

/**
 * Check if a finding type is safe for autonomous fixing.
 * 
 * Autonomous Fix Gating Rules (GOVERNANCE.md):
 *   1. Confidence ≥ 70%
 *   2. Affects template, not individual page (unless cart/checkout)
 *   3. Estimated affected pages ≥ 5
 *   4. Fix is reversible (meta tags, canonicals, links — never delete content)
 *   5. No conflict with other detected issues
 */
export function isAutoFixable(issueType) {
    const autoFixableTypes = [
        'missing-meta-description',   // Add meta description tag
        'duplicate-title',            // Update title template
        'duplicate-meta-description', // Update meta description template
        'missing-canonical',          // Add self-referencing canonical
        'canonical-chain',            // Fix canonical target
        'reciprocal-canonical',       // Break reciprocal canonical
        'h1-equals-title',            // Differentiate H1 from title
        'multiple-h1',                // Consolidate to single H1
        'missing-h1',                 // Add H1 tag
    ];
    
    const notAutoFixable = [
        'hidden-h1',                  // Requires design review
        'broken-internal-links',      // Requires knowing correct URL
        'sitemap-dead-page',          // Requires content decision
        'sitemap-noindex',            // Requires content strategy
        'noindex-linked',             // Requires content strategy
        'thin-content',               // Requires content creation
        'deep-content-orphan',        // Requires linking strategy
        'high-priority-orphan',       // Requires linking strategy
        'canonical-dead',             // Requires knowing correct URL
        'link-equity-wasted',         // Requires architecture decision
    ];
    
    if (notAutoFixable.includes(issueType)) return false;
    if (autoFixableTypes.includes(issueType)) return true;
    
    // Unknown types: conservative — don't auto-fix
    return false;
}

// =============================================================================
// PRE-FLIGHT VERIFICATION
// =============================================================================

/**
 * Verify a finding before applying an autonomous fix.
 * Uses ValidationEngine to check the target element exists and is in expected state.
 * 
 * @returns {boolean} True if verified safe to fix
 */
async function preFlightVerify(issue, template) {
    // Get a sample URL to verify against
    const sampleUrl = template.samples?.[0] || template.allUrls?.[0];
    if (!sampleUrl) {
        console.warn('[Bridge] No sample URL for verification');
        return false;
    }
    
    try {
        // Query ValidationEngine for pre-flight check
        // This validates the target element exists before we attempt any fix
        const verification = await ValidationEngine.verify({
            url: sampleUrl,
            findingType: issue.type || issue.subtype,
            templatePattern: template.pattern,
            expectedState: issue.type === 'missing-h1' ? 'absent' : 
                          issue.type === 'missing-meta-description' ? 'absent' : 'present'
        });
        
        if (!verification.verified) {
            console.warn(`[Bridge] Pre-flight failed for ${issue.type} on ${sampleUrl}: ${verification.reason}`);
            return false;
        }
        
        // Additional gates from GOVERNANCE.md
        const confidence = parseConfidence(issue.confidence || template.classificationConfidence || 'medium');
        if (confidence < 0.7) {
            console.warn(`[Bridge] Confidence too low for auto-fix: ${confidence}`);
            return false;
        }
        
        const affectedPages = issue.estimatedAffectedPages || template.instanceCount || 1;
        if (affectedPages < 5 && !['cart', 'checkout'].includes(template.pageType)) {
            console.warn(`[Bridge] Affected pages too few for auto-fix: ${affectedPages}`);
            return false;
        }
        
        return true;
        
    } catch (err) {
        console.error(`[Bridge] Verification error: ${err.message}`);
        return false;
    }
}

// =============================================================================
// SCHEMA MAPPING
// =============================================================================

/**
 * Map a v2 finding to the existing Rankfixer findings database schema.
 */
function mapToFindingsSchema(auditId, template, issue, rpes, action, verified) {
    const now = new Date().toISOString();
    
    return {
        // Core identifiers
        [COLUMN_MAP.auditId]: auditId,
        [COLUMN_MAP.templatePattern]: template.pattern,
        [COLUMN_MAP.issueType]: issue.type || issue.subtype,
        [COLUMN_MAP.severity]: issue.severity || 'warning',
        
        // Template context (preserved for grouping in the UI)
        [COLUMN_MAP.instanceCount]: template.instanceCount,
        [COLUMN_MAP.extrapolatedImpact]: issue.estimatedAffectedPages || template.instanceCount,
        [COLUMN_MAP.confidence]: parseConfidence(issue.confidence || template.classificationConfidence || 'medium'),
        [COLUMN_MAP.sampleCount]: template.sampleCount,
        [COLUMN_MAP.sampleUrls]: JSON.stringify(template.samples || []),
        
        // RPES governance
        [COLUMN_MAP.rpesScore]: rpes.score,
        [COLUMN_MAP.rpesCategory]: rpes.category,
        [COLUMN_MAP.action]: verified ? action : 'recommend',  // Downgrade if verification failed
        [COLUMN_MAP.recommendation]: issue.recommendation || '',
        
        // Evidence
        [COLUMN_MAP.evidence]: JSON.stringify({
            message: issue.message,
            affectedSamples: issue.affectedSamples || issue.affectedUrls || [],
            templatePageType: template.pageType,
            classificationConfidence: template.classificationConfidence
        }),
        
        // Auto-fix metadata
        [COLUMN_MAP.autoFixable]: isAutoFixable(issue.type || issue.subtype),
        [COLUMN_MAP.autoFixConfidence]: verified ? parseConfidence(issue.confidence || 'medium') : 0,
        [COLUMN_MAP.appliedFix]: null,
        [COLUMN_MAP.fixTimestamp]: null,
        
        // Timestamps
        created_at: now,
        updated_at: now
    };
}

// =============================================================================
// AUTO-FIX QUEUE
// =============================================================================

/**
 * Queue a finding for autonomous fix by Hermes.
 */
async function queueAutoFix(findingRecord, issue, template) {
    const fixInstruction = buildFixInstruction(issue, template);
    
    if (!fixInstruction) {
        console.warn(`[Bridge] No fix instruction for ${issue.type}`);
        return;
    }
    
    await db(AUTO_FIX_QUEUE).insert({
        finding_id: findingRecord[COLUMN_MAP.auditId] + '_' + findingRecord[COLUMN_MAP.issueType],
        audit_id: findingRecord[COLUMN_MAP.auditId],
        template_pattern: findingRecord[COLUMN_MAP.templatePattern],
        issue_type: findingRecord[COLUMN_MAP.issueType],
        rpes_score: findingRecord[COLUMN_MAP.rpesScore],
        fix_instruction: JSON.stringify(fixInstruction),
        status: 'queued',
        created_at: new Date().toISOString()
    });
    
    console.log(`[Bridge] Queued auto-fix: ${issue.type} on ${template.pattern}`);
}

/**
 * Build a specific fix instruction based on finding type.
 */
function buildFixInstruction(issue, template) {
    const type = issue.type || issue.subtype;
    
    const fixTemplates = {
        'missing-h1': {
            action: 'add_element',
            selector: 'main, .content, article',
            element: '<h1>{page_title}</h1>',
            placement: 'prepend'
        },
        'missing-meta-description': {
            action: 'add_meta_tag',
            tag: 'meta',
            attributes: { name: 'description', content: '{page_description}' }
        },
        'duplicate-title': {
            action: 'update_title_template',
            current: '{site_name}',
            recommended: '{page_title} — {site_name}'
        },
        'duplicate-meta-description': {
            action: 'update_meta_template',
            current: '{default_description}',
            recommended: '{page_specific_description}'
        },
        'missing-canonical': {
            action: 'add_link_tag',
            rel: 'canonical',
            href: '{page_url}'
        },
        'canonical-chain': {
            action: 'update_canonical_target',
            current: '{chain_target}',
            recommended: '{final_canonical_url}'
        },
        'reciprocal-canonical': {
            action: 'break_reciprocal_canonical',
            instruction: 'Choose one canonical direction and update both pages'
        },
        'h1-equals-title': {
            action: 'update_h1',
            current: '{title_text}',
            recommended: '{page_specific_h1}'
        },
        'multiple-h1': {
            action: 'consolidate_h1',
            instruction: 'Keep the primary H1, convert others to H2'
        }
    };
    
    return fixTemplates[type] || null;
}

// =============================================================================
// HELPERS
// =============================================================================

function parseConfidence(confidence) {
    if (typeof confidence === 'number') return confidence;
    if (confidence === 'high') return 0.9;
    if (confidence === 'medium') return 0.7;
    if (confidence === 'low') return 0.4;
    if (confidence === 'url-only') return 0.5;
    if (confidence === 'refined') return 0.8;
    return 0.5;
}

// =============================================================================
// DB INTERFACE (placeholder — replace with your actual DB module)
// =============================================================================

// Minimal DB interface for the bridge to work standalone.
// Replace with your actual database module (Prisma, Knex, Sequelize, etc.)
const db = (table) => ({
    insert: async (data) => {
        // Replace with actual DB insert
        console.log(`[DB] INSERT INTO ${table}:`, JSON.stringify(data).substring(0, 100) + '...');
        return { id: Math.random().toString(36).substring(7) };
    },
    find: async (query) => {
        // Replace with actual DB query
        return [];
    }
});

export { calculateRPES, isAutoFixable, getGovernanceAction, mapToFindingsSchema };
