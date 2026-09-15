// api-server.js
// Rankfixer Platform — API Controller
// Fastify-based REST API wrapping the control loop engines.
// Handles auth, queuing, status polling, and report delivery.

import Fastify from 'fastify';
import crypto from 'crypto';

// =============================================================================
// DATABASE INTERFACE (replace with actual pg/Knex/Prisma client)
// =============================================================================

// Placeholder — in production, use:
// import { db } from './db.js';  // Knex or Prisma client
const db = {
    query: async (sql, params) => {
        console.log('[DB]', sql.substring(0, 80));
        return { rows: [] };
    },
    // Tenant operations
    findTenant: async (apiKey) => ({ id: 'demo-tenant', name: 'Demo' }),
    // Audit operations
    createAudit: async (data) => ({ id: crypto.randomUUID(), ...data }),
    updateAudit: async (id, data) => {},
    getAudit: async (id) => null,
    getAuditsForSite: async (siteId, limit) => ({ rows: [] }),
    // Site operations
    getSite: async (id) => null,
    getSitesForTenant: async (tenantId) => ({ rows: [] }),
    // Finding operations
    getFindingsForAudit: async (auditId) => ({ rows: [] }),
    // Action operations
    getActionsForAudit: async (auditId) => ({ rows: [] }),
    approveAction: async (id) => {},
    // Health
    getTenantHealth: async (tenantId) => null,
    getSiteTrend: async (siteId) => ({ rows: [] })
};

// =============================================================================
// AUTH MIDDLEWARE
// =============================================================================

async function authenticate(request, reply) {
    const apiKey = request.headers['x-api-key'];
    if (!apiKey) {
        return reply.status(401).send({ error: 'Missing API key' });
    }
    
    const tenant = await db.findTenant(apiKey);
    if (!tenant) {
        return reply.status(401).send({ error: 'Invalid API key' });
    }
    
    request.tenant = tenant;
}

// =============================================================================
// AUDIT WORKER QUEUE (in-memory for MVP, replace with BullMQ/Redis)
// =============================================================================

const auditQueue = [];
let isWorkerRunning = false;

async function enqueueAudit(auditId, siteId, tenantId, auditType, options = {}) {
    auditQueue.push({ auditId, siteId, tenantId, auditType, options, queuedAt: new Date() });
    console.log(`[Queue] Enqueued audit ${auditId} (${auditQueue.length} in queue)`);
    
    if (!isWorkerRunning) {
        processAuditQueue();
    }
}

async function processAuditQueue() {
    if (isWorkerRunning) return;
    isWorkerRunning = true;
    
    while (auditQueue.length > 0) {
        const job = auditQueue.shift();
        
        try {
            await db.updateAudit(job.auditId, { status: 'in_progress', started_at: new Date().toISOString() });
            
            // Import and run the appropriate control loop
            if (job.auditType === 'seo' || job.auditType === 'full') {
                await runSEOControlLoop(job);
            }
            if (job.auditType === 'infrastructure' || job.auditType === 'full') {
                await runInfraControlLoop(job);
            }
            
            await db.updateAudit(job.auditId, { 
                status: 'completed', 
                completed_at: new Date().toISOString() 
            });
            
        } catch (err) {
            console.error(`[Worker] Audit ${job.auditId} failed:`, err.message);
            await db.updateAudit(job.auditId, { 
                status: 'failed', 
                error_message: err.message,
                completed_at: new Date().toISOString()
            });
        }
    }
    
    isWorkerRunning = false;
}

async function runSEOControlLoop(job) {
    console.log(`[Worker] Running SEO audit for site ${job.siteId}`);
    
    // Phase notifications
    const phases = ['mapping', 'planning', 'executing', 'verifying'];
    for (const phase of phases) {
        await db.updateAudit(job.auditId, { phase, phase_progress: 0 });
        
        // In production, this calls the actual SEO control loop:
        // import { runDeepAuditV2 } from '../rankfixer-mapper/audit-report-v2.js';
        // const report = await runDeepAuditV2(siteUrl);
        
        // Simulate work
        await new Promise(r => setTimeout(r, 500));
        await db.updateAudit(job.auditId, { phase_progress: 100 });
    }
    
    // Store findings
    const mockFindings = [
        { type: 'missing-h1', severity: 'critical', title: 'Missing H1 on product template', affected: 243, auto: true },
        { type: 'duplicate-title', severity: 'critical', title: 'Duplicate titles across 101 pages', affected: 101, auto: true },
        { type: 'missing-meta', severity: 'warning', title: 'Missing meta description on collection pages', affected: 1053, auto: true },
    ];
    
    for (const f of mockFindings) {
        await db.query(
            `INSERT INTO findings (audit_id, site_id, tenant_id, finding_type, severity, domain, title, affected_count, auto_approvable, status) 
             VALUES ($1, $2, $3, $4, $5, 'seo', $6, $7, $8, 'open')`,
            [job.auditId, job.siteId, job.tenantId, f.type, f.severity, f.title, f.affected, f.auto]
        );
    }
    
    await db.updateAudit(job.auditId, { 
        health_score: 72, 
        total_assets: 2326, 
        critical_issues: 2, 
        warning_issues: 1 
    });
}

async function runInfraControlLoop(job) {
    console.log(`[Worker] Running infra audit for site ${job.siteId}`);
    
    // In production: import { runControlLoop } from '../infrastructure/state-manager.js';
    
    await new Promise(r => setTimeout(r, 300));
    
    await db.updateAudit(job.auditId, { 
        health_score: 85, 
        total_assets: 7, 
        critical_issues: 4, 
        warning_issues: 3 
    });
}

// =============================================================================
// API ROUTES
// =============================================================================

export async function buildApp() {
    const app = Fastify({ logger: true });
    
    // Auth middleware on all routes
    app.addHook('onRequest', authenticate);
    
    // ── Health ──────────────────────────────────────────────────
    app.get('/api/health', async (request) => {
        return { status: 'ok', tenant: request.tenant.name, timestamp: new Date().toISOString() };
    });
    
    // ── Sites ───────────────────────────────────────────────────
    app.get('/api/sites', async (request) => {
        const sites = await db.getSitesForTenant(request.tenant.id);
        return { sites: sites.rows };
    });
    
    app.get('/api/sites/:siteId', async (request, reply) => {
        const site = await db.getSite(request.params.siteId);
        if (!site) return reply.status(404).send({ error: 'Site not found' });
        return { site };
    });
    
    // ── Audits ──────────────────────────────────────────────────
    
    // Start a new audit
    app.post('/api/sites/:siteId/audit', async (request, reply) => {
        const { siteId } = request.params;
        const { audit_type = 'full', options = {} } = request.body || {};
        
        const site = await db.getSite(siteId);
        if (!site) return reply.status(404).send({ error: 'Site not found' });
        
        const audit = await db.createAudit({
            site_id: siteId,
            tenant_id: request.tenant.id,
            audit_type,
            status: 'pending',
            trigger: 'manual'
        });
        
        // Enqueue for async processing
        await enqueueAudit(audit.id, siteId, request.tenant.id, audit_type, options);
        
        return reply.status(202).send({ 
            audit_id: audit.id, 
            status: 'pending',
            message: 'Audit queued. Poll /api/audit/:id for status.'
        });
    });
    
    // Get audit status
    app.get('/api/audit/:auditId', async (request, reply) => {
        const audit = await db.getAudit(request.params.auditId);
        if (!audit) return reply.status(404).send({ error: 'Audit not found' });
        return { audit };
    });
    
    // Get audit findings
    app.get('/api/audit/:auditId/findings', async (request) => {
        const findings = await db.getFindingsForAudit(request.params.auditId);
        return { findings: findings.rows };
    });
    
    // Get audit remediation actions
    app.get('/api/audit/:auditId/actions', async (request) => {
        const actions = await db.getActionsForAudit(request.params.auditId);
        return { actions: actions.rows };
    });
    
    // Get audit report
    app.get('/api/audit/:auditId/report', async (request, reply) => {
        const audit = await db.getAudit(request.params.auditId);
        if (!audit) return reply.status(404).send({ error: 'Audit not found' });
        
        if (audit.status !== 'completed') {
            return reply.status(202).send({ 
                status: audit.status, 
                phase: audit.phase,
                progress: audit.phase_progress,
                message: 'Report not ready. Audit still in progress.' 
            });
        }
        
        const findings = await db.getFindingsForAudit(request.params.auditId);
        const actions = await db.getActionsForAudit(request.params.auditId);
        
        return {
            audit,
            findings: findings.rows,
            actions: actions.rows,
            report_url: `/api/audit/${request.params.auditId}/report/pdf`
        };
    });
    
    // List audits for a site
    app.get('/api/sites/:siteId/audits', async (request) => {
        const { limit = 10 } = request.query;
        const audits = await db.getAuditsForSite(request.params.siteId, limit);
        return { audits: audits.rows };
    });
    
    // ── Actions ─────────────────────────────────────────────────
    
    // Approve a remediation action
    app.post('/api/actions/:actionId/approve', async (request, reply) => {
        await db.approveAction(request.params.actionId);
        return { status: 'approved', message: 'Action approved. Will execute in next cycle.' };
    });
    
    // Reject a remediation action
    app.post('/api/actions/:actionId/reject', async (request, reply) => {
        await db.query(
            `UPDATE remediation_actions SET status = 'rejected', updated_at = NOW() WHERE id = $1`,
            [request.params.actionId]
        );
        return { status: 'rejected' };
    });
    
    // ── Health & Trends ─────────────────────────────────────────
    
    app.get('/api/tenant/health', async (request) => {
        const health = await db.getTenantHealth(request.tenant.id);
        return { health };
    });
    
    app.get('/api/sites/:siteId/trends', async (request) => {
        const trends = await db.getSiteTrend(request.params.siteId);
        return { trends: trends.rows };
    });
    
    // ── Governance ──────────────────────────────────────────────
    
    app.get('/api/governance', async (request) => {
        const profiles = await db.query(
            `SELECT * FROM governance_profiles WHERE tenant_id = $1`,
            [request.tenant.id]
        );
        return { profiles: profiles.rows };
    });
    
    app.put('/api/governance/:profileId', async (request) => {
        const updates = request.body;
        await db.query(
            `UPDATE governance_profiles SET ${Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ')}, updated_at = NOW() 
             WHERE id = $1 AND tenant_id = $2`,
            [request.params.profileId, request.tenant.id, ...Object.values(updates)]
        );
        return { status: 'updated' };
    });
    
    return app;
}

// =============================================================================
// START SERVER
// =============================================================================

const PORT = process.env.PORT || 3001;

const app = await buildApp();

app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
        console.error('Failed to start:', err);
        process.exit(1);
    }
    console.log(`\n═══════════════════════════════════════════`);
    console.log(`  Rankfixer API Server`);
    console.log(`  ${address}`);
    console.log(`  Docs: ${address}/api/health`);
    console.log(`═══════════════════════════════════════════\n`);
});
