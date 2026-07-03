// state-manager.js
// Infrastructure Control Plane — State Manager
// Persists resource inventory, remediation plans, and fix verification.

import fs from 'fs';
import path from 'path';

const ACTION_STATES = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    VERIFYING: 'verifying',
    RESOLVED: 'resolved',
    FAILED: 'failed',
    DEFERRED: 'deferred',
    ROLLED_BACK: 'rolled_back',
    SKIPPED: 'skipped'
};

const VALID_TRANSITIONS = {
    [ACTION_STATES.PENDING]:      [ACTION_STATES.IN_PROGRESS, ACTION_STATES.DEFERRED, ACTION_STATES.SKIPPED],
    [ACTION_STATES.IN_PROGRESS]:  [ACTION_STATES.VERIFYING, ACTION_STATES.FAILED, ACTION_STATES.ROLLED_BACK],
    [ACTION_STATES.VERIFYING]:    [ACTION_STATES.RESOLVED, ACTION_STATES.FAILED],
    [ACTION_STATES.FAILED]:       [ACTION_STATES.PENDING],
    [ACTION_STATES.DEFERRED]:     [ACTION_STATES.PENDING, ACTION_STATES.IN_PROGRESS],
    [ACTION_STATES.ROLLED_BACK]:  [ACTION_STATES.PENDING],
    [ACTION_STATES.RESOLVED]:     [],
    [ACTION_STATES.SKIPPED]:      [ACTION_STATES.PENDING]
};

// Filesystem-safe ID encoding
function safeId(id) {
    return id.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

export class StateStore {
    constructor(basePath = './infra-state') {
        this.basePath = basePath;
        ensureDir(path.join(basePath, 'inventory'));
        ensureDir(path.join(basePath, 'plans'));
        ensureDir(path.join(basePath, 'actions'));
        ensureDir(path.join(basePath, 'history'));
    }

    saveInventory(inventory, label = 'latest') {
        ensureDir(path.join(this.basePath, 'inventory'));
        const fp = path.join(this.basePath, 'inventory', `resources-${safeId(label)}.json`);
        fs.writeFileSync(fp, JSON.stringify(inventory, null, 2));
        return fp;
    }

    loadInventory(label = 'latest') {
        const fp = path.join(this.basePath, 'inventory', `resources-${safeId(label)}.json`);
        return fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, 'utf-8')) : null;
    }

    savePlan(plan, label) {
        ensureDir(path.join(this.basePath, 'plans'));
        const ts = label || new Date().toISOString().replace(/[:.]/g, '-');
        const fp = path.join(this.basePath, 'plans', 'plan-' + ts + '.json');
        fs.writeFileSync(fp, JSON.stringify(plan, null, 2));
        return fp;
    }

    loadPlan(label) {
        const fp = path.join(this.basePath, 'plans', label + '.json');
        return fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, 'utf-8')) : null;
    }

    getLatestPlan() {
        const plansDir = path.join(this.basePath, 'plans');
        if (!fs.existsSync(plansDir)) return null;
        const plans = fs.readdirSync(plansDir).filter(f => f.endsWith('.json')).sort().reverse();
        return plans.length > 0 ? this.loadPlan(plans[0].replace('.json', '')) : null;
    }

    getActionState(actionId) {
        const fp = path.join(this.basePath, 'actions', `${safeId(actionId)}.json`);
        return fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, 'utf-8')) : null;
    }

    saveActionState(actionId, state, metadata = {}) {
        ensureDir(path.join(this.basePath, 'actions'));
        const fp = path.join(this.basePath, 'actions', `${safeId(actionId)}.json`);
        const existing = fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, 'utf-8')) : {};
        const updated = {
            ...existing, actionId, currentState: state,
            stateHistory: [...(existing.stateHistory || []), { from: existing.currentState || 'initial', to: state, timestamp: new Date().toISOString(), metadata }],
            lastUpdated: new Date().toISOString()
        };
        fs.writeFileSync(fp, JSON.stringify(updated, null, 2));
        return updated;
    }

    transitionAction(actionId, newState, metadata = {}) {
        const current = this.getActionState(actionId);
        const currentState = current?.currentState || ACTION_STATES.PENDING;
        const allowed = VALID_TRANSITIONS[currentState] || [];
        if (!allowed.includes(newState)) throw new Error(`Invalid transition: ${currentState} → ${newState}`);
        return this.saveActionState(actionId, newState, metadata);
    }

    getActionsByState(state) {
        const dir = path.join(this.basePath, 'actions');
        if (!fs.existsSync(dir)) return [];
        const actions = [];
        for (const file of fs.readdirSync(dir)) {
            if (!file.endsWith('.json')) continue;
            const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
            if (data.currentState === state) actions.push(data);
        }
        return actions;
    }

    saveAuditEntry(entry) {
        ensureDir(path.join(this.basePath, 'history'));
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const fp = path.join(this.basePath, 'history', `audit-${safeId(ts)}.json`);
        fs.writeFileSync(fp, JSON.stringify({ ...entry, timestamp: new Date().toISOString() }, null, 2));
        return fp;
    }

    getSystemSummary() {
        const latestPlan = this.getLatestPlan();
        const pending = this.getActionsByState(ACTION_STATES.PENDING);
        const resolved = this.getActionsByState(ACTION_STATES.RESOLVED);
        const failed = this.getActionsByState(ACTION_STATES.FAILED);
        const deferred = this.getActionsByState(ACTION_STATES.DEFERRED);
        return {
            timestamp: new Date().toISOString(),
            plan: latestPlan ? { totalActions: latestPlan.actions?.length || 0, criticalActions: latestPlan.summary?.criticalActions || 0 } : null,
            actions: { pending: pending.length, resolved: resolved.length, failed: failed.length, deferred: deferred.length, total: pending.length + resolved.length + failed.length + deferred.length },
            health: { resolvedRate: resolved.length / Math.max(resolved.length + failed.length, 1) }
        };
    }
}

export function verifyRemediation(originalNodes, currentNodes, fixedActionIds, store = null) {
    const report = { timestamp: new Date().toISOString(), totalVerified: fixedActionIds.length, resolved: 0, partiallyResolved: 0, unresolved: 0, details: [] };
    for (const actionId of fixedActionIds) {
        const resourceId = actionId.split('-').slice(0, -2).join('-');
        const orig = originalNodes?.get(resourceId);
        const curr = currentNodes?.get(resourceId);
        if (!orig || !curr) { report.unresolved++; continue; }
        const hadFields = orig.drift.fields?.length || 0;
        const hasFields = curr.drift.fields?.length || 0;
        const status = !curr.drift.detected ? 'resolved' : hasFields < hadFields ? 'partially_resolved' : 'unresolved';
        if (status === 'resolved') report.resolved++;
        else if (status === 'partially_resolved') report.partiallyResolved++;
        else report.unresolved++;
        report.details.push({ actionId, resourceId, status, driftBefore: hadFields, driftAfter: hasFields });
        if (store) store.transitionAction(actionId, status === 'resolved' ? ACTION_STATES.RESOLVED : ACTION_STATES.FAILED);
    }
    return report;
}

export function createCheckpoint(resourceNodes, plan, store, label = null) {
    const ts = label || new Date().toISOString().replace(/[:.]/g, '-');
    store.saveInventory({ timestamp: ts, nodeCount: resourceNodes.size, nodes: [...resourceNodes.values()] }, `checkpoint-${ts}`);
    store.savePlan(plan, `checkpoint-${ts}`);
    for (const action of (plan.actions || [])) {
        if (!store.getActionState(action.id)) store.saveActionState(action.id, ACTION_STATES.PENDING);
    }
    return ts;
}

export function resumeFromCheckpoint(store) {
    const invDir = path.join(store.basePath, 'inventory');
    const planDir = path.join(store.basePath, 'plans');
    if (!fs.existsSync(invDir) || !fs.existsSync(planDir)) return null;
    const invFiles = fs.readdirSync(invDir).filter(f => f.startsWith('checkpoint-')).sort().reverse();
    const planFiles = fs.readdirSync(planDir).filter(f => f.startsWith('checkpoint-')).sort().reverse();
    if (!invFiles.length || !planFiles.length) return null;
    return {
        inventory: store.loadInventory(invFiles[0].replace('.json', '')),
        plan: store.loadPlan(planFiles[0].replace('.json', '')),
        pendingActions: store.getActionsByState(ACTION_STATES.PENDING),
        checkpointLabel: planFiles[0].replace('checkpoint-', '').replace('.json', '')
    };
}

export async function runControlLoop(declaredResources, actualResources, provider, options = {}) {
    const { environment = 'prod', dryRun = true, autoApprove = false, blastRadiusLimit = 50, storePath = './infra-state' } = options;
    const store = new StateStore(storePath);
    const t0 = Date.now();

    console.log('═══════════════════════════════════════════');
    console.log('  Infrastructure Control Loop');
    console.log(`  Provider: ${provider} | Environment: ${environment}`);
    console.log(`  Dry run: ${dryRun} | Auto-approve: ${autoApprove}`);
    console.log('═══════════════════════════════════════════\n');

    console.log('[1/5] Mapping resources...');
    const { mapResources } = await import('./resource-mapper.js');
    const { nodes, summary: mapSummary } = mapResources(declaredResources, actualResources, provider);
    const preNodes = new Map(nodes);
    store.saveInventory({ phase: 'pre-remediation', summary: mapSummary, nodes: [...nodes.values()] }, 'pre-remediation');

    console.log('\n[2/5] Generating plan...');
    const { generateRemediationPlan } = await import('./remediation-engine.js');
    const plan = generateRemediationPlan(nodes, environment, { dryRun, autoApprove, blastRadiusLimit });
    store.savePlan(plan);
    for (const action of plan.actions) store.saveActionState(action.id, ACTION_STATES.PENDING);

    console.log('\n[3/5] Executing...');
    const { executeRemediationPlan } = await import('./remediation-engine.js');
    for (const action of plan.actions) {
        if (action.autoApprovable && !action.requiresManualReview && !dryRun) store.transitionAction(action.id, ACTION_STATES.IN_PROGRESS);
    }
    const execResults = await executeRemediationPlan(plan, { dryRun, autoApprove, blastRadiusLimit });
    for (const d of execResults.details) {
        if (d.status === 'executed') store.transitionAction(d.actionId, ACTION_STATES.VERIFYING);
        else if (d.status === 'failed') store.transitionAction(d.actionId, ACTION_STATES.FAILED);
        else if (d.status === 'deferred') store.transitionAction(d.actionId, ACTION_STATES.DEFERRED);
        else if (d.status === 'dry_run') store.transitionAction(d.actionId, ACTION_STATES.SKIPPED);
    }

    console.log('\n[4/5] Re-mapping post-remediation...');
    const { nodes: postNodes } = mapResources(declaredResources, actualResources, provider);

    console.log('\n[5/5] Verifying...');
    const fixedIds = execResults.details.filter(d => d.status === 'executed').map(d => d.actionId);
    const verification = verifyRemediation(preNodes, postNodes, fixedIds, store);
    store.saveInventory({ phase: 'post-remediation', nodes: [...postNodes.values()] }, 'post-remediation');
    store.saveAuditEntry({ type: 'control_loop', provider, environment, dryRun, duration: ((Date.now()-t0)/1000).toFixed(1)+'s', mapping: mapSummary, plan: plan.summary, execution: { executed: execResults.executed, deferred: execResults.deferred, failed: execResults.failed }, verification: { resolved: verification.resolved, unresolved: verification.unresolved } });

    const duration = ((Date.now()-t0)/1000).toFixed(1);
    console.log(`\n═══════════════════════════════════════════`);
    console.log(`  Done: ${duration}s | Resources: ${mapSummary.totalResources}`);
    console.log(`  Drift: ${mapSummary.driftDetected} (${mapSummary.criticalDrift} critical)`);
    console.log(`  Executed: ${execResults.executed} | Resolved: ${verification.resolved}`);
    console.log('═══════════════════════════════════════════');

    return { duration, mapping: mapSummary, plan: plan.summary, execution: execResults, verification, store };
}
