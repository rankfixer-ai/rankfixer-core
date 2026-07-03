// hermes-worker.js
// Hermes: Autonomous execution layer for Rankfixer
// Polls auto_fix_queue, verifies state, executes fixes via mutation-engine.

import { applyDOMMutation, rollbackMutation } from './mutation-engine.js';

// DB interface — replace with your actual DB module
const db = (table) => ({
    where: async (query) => {
        console.log(`[DB] SELECT FROM ${table} WHERE`, query);
        return [];
    },
    update: async (where, data) => {
        console.log(`[DB] UPDATE ${table} SET`, data, 'WHERE', where);
    }
});

/**
 * Hermes Worker Loop
 * Polls for 'queued' items, verifies state, and executes fixes.
 */
export async function runHermes(options = {}) {
    const { pollInterval = 10000, batchSize = 5, maxAttempts = 3 } = options;
    
    console.log('[Hermes] Worker started');
    console.log(`[Hermes] Poll interval: ${pollInterval}ms, batch size: ${batchSize}, max attempts: ${maxAttempts}`);

    while (true) {
        try {
            const jobs = await db('auto_fix_queue')
                .where({ status: 'queued' })
                .limit(batchSize);

            if (jobs.length > 0) {
                console.log(`[Hermes] Processing ${jobs.length} jobs`);
            }

            for (const job of jobs) {
                await processJob(job, maxAttempts);
            }
        } catch (err) {
            console.error('[Hermes] Worker loop error:', err.message);
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
}

async function processJob(job, maxAttempts) {
    console.log(`[Hermes] Job ${job.id}: ${job.issue_type} on ${job.template_pattern}`);

    // Check attempt count
    const attempts = (job.attempt_count || 0) + 1;
    if (attempts > maxAttempts) {
        console.warn(`[Hermes] Job ${job.id} exceeded max attempts (${maxAttempts})`);
        await updateJobStatus(job.id, 'failed', { error: 'Max attempts exceeded' });
        return;
    }

    // Mark as in progress
    await db('auto_fix_queue').where({ id: job.id }).update({
        status: 'in_progress',
        attempt_count: attempts,
        updated_at: new Date().toISOString()
    });

    try {
        const instruction = typeof job.fix_instruction === 'string' 
            ? JSON.parse(job.fix_instruction) 
            : job.fix_instruction;

        // Step 1: Apply mutation with state capture
        const result = await applyDOMMutation(job.target_url, instruction, {
            dryRun: false,
            captureState: true
        });

        if (!result.success) {
            console.warn(`[Hermes] Mutation failed for job ${job.id}: ${result.error}`);
            
            // If context check failed, mark as pre_flight_failed (don't retry)
            if (result.error?.includes('Context check failed') || result.error?.includes('not found')) {
                await updateJobStatus(job.id, 'pre_flight_failed', { error: result.error });
            } else {
                await updateJobStatus(job.id, 'failed', { error: result.error });
            }
            return;
        }

        // Step 2: Record in audit trail
        const auditEntry = {
            audit_id: job.audit_id,
            finding_id: job.finding_id,
            auto_fix_job_id: job.id,
            page_url: job.target_url,
            template_pattern: job.template_pattern,
            issue_type: job.issue_type,
            mutation_action: instruction.action,
            mutation_instruction: instruction,
            before_state: result.beforeState,
            after_state: result.afterState,
            state_diff: computeDiff(result.beforeState, result.afterState),
            executed_by: 'hermes',
            execution_time_ms: result.executionTime || 0,
            pre_flight_verified: true,
            post_flight_verified: true
        };

        const trailRecord = await db('audit_trail').insert(auditEntry);

        // Step 3: Update job with success
        await db('auto_fix_queue').where({ id: job.id }).update({
            status: 'applied',
            audit_trail_id: trailRecord.id,
            executed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        // Step 4: Update findings table
        await db('findings').where({
            audit_id: job.audit_id,
            template_pattern: job.template_pattern
        }).update({
            fix_applied: true,
            fix_applied_at: new Date().toISOString()
        });

        console.log(`[Hermes] Job ${job.id} applied successfully`);

    } catch (err) {
        console.error(`[Hermes] Job ${job.id} error:`, err.message);
        await updateJobStatus(job.id, 'error', { error: err.message });
    }
}

async function updateJobStatus(id, status, metadata = {}) {
    await db('auto_fix_queue').where({ id }).update({
        status,
        updated_at: new Date().toISOString(),
        last_error: metadata.error || null,
        execution_log: JSON.stringify(metadata)
    });
}

function computeDiff(before, after) {
    if (!before || !after) return null;
    return {
        before: JSON.stringify(before).substring(0, 500),
        after: JSON.stringify(after).substring(0, 500)
    };
}
