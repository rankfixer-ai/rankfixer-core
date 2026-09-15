// api-dashboard.js
// Rankfixer Platform — Dashboard API Contract
// Single endpoint that powers the entire executive view.
// Added to api-server.js routes.

// =============================================================================
// GET /api/dashboard/summary
// =============================================================================
// Returns everything needed for the one-screen executive view.
// No pagination. No filters. Just the answer to "Am I better off?"

/*
 * RESPONSE CONTRACT:
 * {
 *   health: {
 *     overall: 78,                    // 0-100 aggregate score
 *     trend: +3,                      // Change since last audit
 *     trendLabel: "better",           // better | worse | stable
 *     domains: [
 *       { name: "SEO", score: 82, trend: +2, status: "healthy" },
 *       { name: "Infrastructure", score: 74, trend: +5, status: "warning" },
 *       { name: "GEO Citation", score: 67, trend: 0, status: "new" }
 *     ]
 *   },
 *   executiveSummary: {
 *     headline: "You're better than yesterday.",    // Primary message
 *     subtext: "3 critical issues were fixed automatically.",  // What changed
 *     callToAction: "1 decision needs your attention.",        // What's needed
 *     lastAuditDate: "2026-07-03T14:10:29Z",
 *     auditDuration: "68.6s"
 *   },
 *   stats: {
 *     totalAssets: 2333,              // Pages + resources
 *     autoFixedSinceLast: 12,         // Fixes applied without human
 *     pendingDecisions: 1,            // Actions needing approval
 *     regressionsDetected: 0,         // Things that got worse
 *     manualHoursSaved: 4.5,          // Estimated time savings
 *     driftIncidentsPrevented: 12     // Issues caught before impact
 *   },
 *   activityFeed: [
 *     {
 *       id: "act-001",
 *       timestamp: "2026-07-03T14:14:00Z",
 *       type: "fixed",                 // fixed | decision_required | detected | rolled_back | trend_alert
 *       icon: "security",              // security | seo | performance | geo
 *       title: "Repaired 4 broken canonical URLs",
 *       subtitle: "across your product template",
 *       beforeState: "4 product pages pointing to dead canonical targets, wasting crawl budget",
 *       afterState: "All canonicals self-referencing correctly. Indexing signals restored.",
 *       affectedCount: 243,
 *       affectedLabel: "product pages",
 *       executionTime: "3.2s",
 *       reversible: true,
 *       actionUrl: "/audit/123/finding/456"
 *     },
 *     {
 *       id: "act-002",
 *       timestamp: "2026-07-03T10:05:00Z",
 *       type: "decision_required",
 *       icon: "security",
 *       title: "Production firewall rule opened port 22",
 *       subtitle: "to the internet on api-server-prod",
 *       risk: "SSH exposed to 0.0.0.0/0",
 *       blastRadius: 12,
 *       blastRadiusLabel: "dependent resources",
 *       recommendation: "Restrict to internal VPC only",
 *       actionUrl: "/audit/123/action/789/approve"
 *     }
 *   ],
 *   healthTrend: [
 *     { date: "2026-06-28", overall: 72, seo: 78, infra: 68, geo: null },
 *     { date: "2026-06-30", overall: 75, seo: 80, infra: 69, geo: null },
 *     { date: "2026-07-03", overall: 78, seo: 82, infra: 74, geo: 67 }
 *   ],
 *   governanceStatus: {
 *     mode: "auto-pilot",              // auto-pilot | co-pilot
 *     autoFixEnabled: true,
 *     pendingApprovalCount: 1,
 *     profileName: "Standard"
 *   }
 * }
 */

export async function getDashboardSummary(tenantId) {
    // ── Current health ──────────────────────────────────────────
    const currentAudit = await db.query(
        `SELECT * FROM audits 
         WHERE tenant_id = $1 AND status = 'completed' 
         ORDER BY completed_at DESC LIMIT 1`,
        [tenantId]
    );
    
    // ── Previous audit for trend ────────────────────────────────
    const previousAudit = await db.query(
        `SELECT * FROM audits 
         WHERE tenant_id = $1 AND status = 'completed' 
         ORDER BY completed_at DESC LIMIT 1 OFFSET 1`,
        [tenantId]
    );
    
    // ── Domain scores ───────────────────────────────────────────
    const seoAudit = await db.query(
        `SELECT * FROM audits WHERE tenant_id = $1 AND audit_type = 'seo' AND status = 'completed' 
         ORDER BY completed_at DESC LIMIT 1`,
        [tenantId]
    );
    const infraAudit = await db.query(
        `SELECT * FROM audits WHERE tenant_id = $1 AND audit_type = 'infrastructure' AND status = 'completed' 
         ORDER BY completed_at DESC LIMIT 1`,
        [tenantId]
    );
    
    // ── Activity feed ───────────────────────────────────────────
    const recentActions = await db.query(
        `SELECT ra.*, f.title as finding_title, f.finding_type
         FROM remediation_actions ra
         LEFT JOIN findings f ON ra.finding_id = f.id
         WHERE ra.tenant_id = $1
         ORDER BY ra.created_at DESC LIMIT 20`,
        [tenantId]
    );
    
    // ── Trend data (last 30 days) ───────────────────────────────
    const trendData = await db.query(
        `SELECT 
            DATE(completed_at) as date,
            AVG(health_score) as overall
         FROM audits 
         WHERE tenant_id = $1 AND status = 'completed' 
            AND completed_at > NOW() - INTERVAL '30 days'
         GROUP BY DATE(completed_at)
         ORDER BY date`,
        [tenantId]
    );
    
    // ── Pending decisions count ──────────────────────────────────
    const pendingDecisions = await db.query(
        `SELECT COUNT(*) as count FROM remediation_actions 
         WHERE tenant_id = $1 AND status = 'pending' AND requires_manual_review = TRUE`,
        [tenantId]
    );
    
    // ── Governance profile ──────────────────────────────────────
    const governance = await db.query(
        `SELECT * FROM governance_profiles WHERE tenant_id = $1 LIMIT 1`,
        [tenantId]
    );
    
    // ── Assemble response ───────────────────────────────────────
    const current = currentAudit.rows[0];
    const previous = previousAudit.rows[0];
    
    const overallScore = current?.health_score || 0;
    const previousScore = previous?.health_score || overallScore;
    const trend = overallScore - previousScore;
    
    const health = {
        overall: overallScore,
        trend: trend,
        trendLabel: trend > 0 ? 'better' : trend < 0 ? 'worse' : 'stable',
        domains: [
            {
                name: 'SEO',
                score: seoAudit.rows[0]?.health_score || null,
                trend: seoAudit.rows[0]?.health_score ? (seoAudit.rows[0].health_score - (previous?.health_score || seoAudit.rows[0].health_score)) : 0,
                status: (seoAudit.rows[0]?.health_score || 0) >= 80 ? 'healthy' : 
                        (seoAudit.rows[0]?.health_score || 0) >= 60 ? 'warning' : 'critical'
            },
            {
                name: 'Infrastructure',
                score: infraAudit.rows[0]?.health_score || null,
                trend: infraAudit.rows[0]?.health_score ? (infraAudit.rows[0].health_score - (previous?.health_score || infraAudit.rows[0].health_score)) : 0,
                status: (infraAudit.rows[0]?.health_score || 0) >= 80 ? 'healthy' : 
                        (infraAudit.rows[0]?.health_score || 0) >= 60 ? 'warning' : 'critical'
            }
        ]
    };
    
    const autoFixedCount = current?.auto_fixed || 0;
    const pendingCount = parseInt(pendingDecisions.rows[0]?.count || 0);
    
    const executiveSummary = {
        headline: trend > 0 ? "You're better than yesterday." : 
                  trend < 0 ? "Some things need attention." : 
                  "Everything is stable.",
        subtext: autoFixedCount > 0 
            ? `${autoFixedCount} issue${autoFixedCount !== 1 ? 's were' : ' was'} fixed automatically.`
            : "No automatic fixes were needed this audit.",
        callToAction: pendingCount > 0 
            ? `${pendingCount} decision${pendingCount !== 1 ? 's need' : ' needs'} your attention.`
            : "No decisions pending — you're all clear.",
        lastAuditDate: current?.completed_at || null,
        auditDuration: current?.duration_ms ? `${(current.duration_ms / 1000).toFixed(1)}s` : null
    };
    
    const stats = {
        totalAssets: current?.total_assets || 0,
        autoFixedSinceLast: autoFixedCount,
        pendingDecisions: pendingCount,
        regressionsDetected: 0, // TODO: compare current vs previous findings
        manualHoursSaved: Math.round(autoFixedCount * 0.375 * 10) / 10, // ~22 min per fix
        driftIncidentsPrevented: current?.critical_issues || 0
    };
    
    // Map recent actions to activity feed cards
    const activityFeed = (recentActions.rows || []).map(action => ({
        id: action.id,
        timestamp: action.created_at,
        type: action.status === 'resolved' ? 'fixed' :
              action.status === 'pending' && action.requires_manual_review ? 'decision_required' :
              action.status === 'rolled_back' ? 'rolled_back' : 'detected',
        icon: action.action_type?.includes('security') || action.action_type?.includes('public') ? 'security' :
              action.action_type?.includes('canonical') || action.action_type?.includes('meta') ? 'seo' :
              action.action_type?.includes('citation') ? 'geo' : 'performance',
        title: action.summary || action.finding_title || 'Issue detected',
        subtitle: '',
        risk: action.severity === 'critical' ? 'Critical — requires immediate attention' : '',
        blastRadius: action.blast_radius || 0,
        recommendation: action.rollback_plan ? 'Fix available' : 'Manual review required',
        affectedCount: action.blast_radius || 1,
        affectedLabel: 'resources',
        executionTime: action.executed_at ? 'Applied' : 'Pending',
        reversible: !!action.rollback_plan,
        actionUrl: action.status === 'pending' ? `/actions/${action.id}/approve` : `/audit/${action.audit_id}`
    }));
    
    // Health trend
    const healthTrend = (trendData.rows || []).map(row => ({
        date: row.date,
        overall: Math.round(row.overall)
    }));
    
    const governanceStatus = {
        mode: governance.rows[0]?.auto_fix_enabled ? 'auto-pilot' : 'co-pilot',
        autoFixEnabled: governance.rows[0]?.auto_fix_enabled || false,
        pendingApprovalCount: pendingCount,
        profileName: governance.rows[0]?.name || 'Standard'
    };
    
    return {
        health,
        executiveSummary,
        stats,
        activityFeed,
        healthTrend,
        governanceStatus
    };
}

// =============================================================================
// Register in API server
// =============================================================================

export function registerDashboardRoutes(app) {
    app.get('/api/dashboard/summary', async (request) => {
        return await getDashboardSummary(request.tenant.id);
    });
}
