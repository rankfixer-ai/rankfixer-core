// reasoning-verifier.js
// RVE — Reasoning Verification Engine: Verifier
// Takes parsed triples and verifies claims against live data sources.
// Pattern: same "declared vs actual" as sitemap/crawl and IaC/cloud.

import { db } from './db.js';  // Your PostgreSQL client

// =============================================================================
// MAIN VERIFICATION ENGINE
// =============================================================================

/**
 * Verify a parsed reasoning chain against live data sources.
 * 
 * @param {ReasoningChain} chain - Output from parseReasoningChain()
 * @param {object} options - { dataSources, strictMode, timeout }
 * @returns {VerificationReport}
 */
export async function verifyReasoningChain(chain, options = {}) {
    const { 
        dataSources = ['database', 'logs', 'metrics'], 
        strictMode = false,
        timeout = 30000 
    } = options;
    
    console.log(`[RVE Verifier] Verifying ${chain.triples.length} triples from ${chain.agent}`);
    
    const startTime = Date.now();
    const results = [];
    
    for (const triple of chain.triples) {
        const result = await verifyTriple(triple, dataSources, chain.actionContext);
        results.push(result);
        
        // Timeout guard
        if (Date.now() - startTime > timeout) {
            console.warn('[RVE Verifier] Timeout reached — marking remaining as unverified');
            for (const remaining of chain.triples.slice(results.length)) {
                results.push({
                    tripleId: remaining.id,
                    status: 'unverified',
                    reason: 'Verification timeout'
                });
            }
            break;
        }
    }
    
    // Aggregate results
    const verified = results.filter(r => r.status === 'verified');
    const contradicted = results.filter(r => r.status === 'contradicted');
    const unverifiable = results.filter(r => r.status === 'unverifiable');
    const hallucinated = results.filter(r => r.status === 'hallucinated');
    
    const verificationScore = chain.triples.length > 0
        ? verified.length / chain.triples.length
        : 0;
    
    // Determine if the reasoning chain is safe to execute
    const executionDecision = determineExecutionDecision(chain, results, strictMode);
    
    return {
        chainId: chain.id,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        totalTriples: chain.triples.length,
        verified: verified.length,
        contradicted: contradicted.length,
        unverifiable: unverifiable.length,
        hallucinated: hallucinated.length,
        verificationScore,
        executionDecision,
        results,
        summary: generateSummary(chain, results, executionDecision)
    };
}

// =============================================================================
// TRIPLE VERIFICATION
// =============================================================================

async function verifyTriple(triple, dataSources, context) {
    const result = {
        tripleId: triple.id,
        claim: triple.claim.text.substring(0, 200),
        status: 'unverified',
        evidenceResults: [],
        contradictions: [],
        verifiedDataPoints: [],
        failedDataPoints: []
    };
    
    // Verify each piece of evidence against data sources
    for (const ev of triple.evidence) {
        const evResult = await verifyEvidence(ev, dataSources, context);
        result.evidenceResults.push(evResult);
        
        if (evResult.status === 'verified') {
            result.verifiedDataPoints.push(...evResult.matchedData);
        }
        if (evResult.status === 'contradicted') {
            result.contradictions.push({
                evidence: ev.text.substring(0, 100),
                contradiction: evResult.contradiction
            });
            result.failedDataPoints.push(...evResult.mismatchedData || []);
        }
        if (evResult.status === 'hallucinated') {
            result.failedDataPoints.push({ reference: ev.reference, reason: 'Source not found' });
        }
    }
    
    // Determine overall triple status
    if (triple.evidence.length === 0) {
        result.status = 'unverifiable';
        result.reason = 'No evidence cited';
    } else if (result.contradictions.length > 0) {
        result.status = 'contradicted';
        result.reason = `${result.contradictions.length} evidence contradictions found`;
    } else if (result.verifiedDataPoints.length > 0) {
        result.status = 'verified';
    } else if (result.failedDataPoints.length === triple.evidence.length) {
        result.status = 'hallucinated';
        result.reason = 'All cited evidence failed verification';
    } else {
        result.status = 'unverifiable';
        result.reason = 'Insufficient verifiable evidence';
    }
    
    return result;
}

// =============================================================================
// EVIDENCE VERIFICATION
// =============================================================================

async function verifyEvidence(evidence, dataSources, context) {
    const result = {
        evidenceText: evidence.text.substring(0, 200),
        source: evidence.source,
        reference: evidence.reference,
        status: 'unverified',
        matchedData: [],
        mismatchedData: [],
        contradiction: null
    };
    
    // If evidence is self-referential, mark as unverifiable
    if (evidence.verifiability === 'self-referential') {
        result.status = 'unverifiable';
        result.contradiction = 'Self-referential evidence cannot be independently verified';
        return result;
    }
    
    // If evidence is classified as hallucinated by the parser, verify strictly
    if (evidence.verifiability === 'hallucinated') {
        // Check if the reference actually exists despite parser's classification
        const exists = await checkReferenceExists(evidence.reference, dataSources);
        if (!exists) {
            result.status = 'hallucinated';
            result.contradiction = `Cited reference "${evidence.reference}" does not exist`;
            return result;
        }
    }
    
    // Verify data points against live sources
    if (evidence.dataPoints.length > 0) {
        for (const dp of evidence.dataPoints) {
            const verification = await verifyDataPoint(dp, dataSources, context);
            
            if (verification.matched) {
                result.matchedData.push(verification);
            } else {
                result.mismatchedData.push(verification);
            }
        }
    }
    
    // Determine status based on data point verification
    if (result.matchedData.length > 0 && result.mismatchedData.length === 0) {
        result.status = 'verified';
    } else if (result.mismatchedData.length > 0) {
        result.status = 'contradicted';
        result.contradiction = `${result.mismatchedData.length} data points did not match reality`;
    } else if (evidence.reference && evidence.verifiability === 'verifiable') {
        // Has a reference but no data points to verify — check reference exists
        const exists = await checkReferenceExists(evidence.reference, dataSources);
        result.status = exists ? 'verified' : 'hallucinated';
        if (!exists) result.contradiction = `Reference "${evidence.reference}" not found`;
    } else {
        result.status = 'unverifiable';
    }
    
    return result;
}

// =============================================================================
// DATA POINT VERIFICATION — The "ground-truthing"
// =============================================================================

async function verifyDataPoint(dataPoint, dataSources, context) {
    const { metric, value, timestamp } = dataPoint;
    
    // Try database verification first
    if (dataSources.includes('database')) {
        const dbResult = await verifyAgainstDatabase(metric, value, timestamp, context);
        if (dbResult !== null) return dbResult;
    }
    
    // Try log verification
    if (dataSources.includes('logs')) {
        const logResult = await verifyAgainstLogs(metric, value, timestamp, context);
        if (logResult !== null) return logResult;
    }
    
    // Try metrics store
    if (dataSources.includes('metrics')) {
        const metricsResult = await verifyAgainstMetrics(metric, value, timestamp, context);
        if (metricsResult !== null) return metricsResult;
    }
    
    // Could not verify against any source
    return {
        metric,
        claimedValue: value,
        actualValue: null,
        matched: false,
        reason: `No data source available for ${metric}`
    };
}

async function verifyAgainstDatabase(metric, claimedValue, timestamp, context) {
    // Query the platform's own database for matching metrics
    try {
        const query = `
            SELECT value, timestamp FROM metrics 
            WHERE metric_name = $1 
            AND timestamp >= $2 - INTERVAL '5 minutes'
            AND timestamp <= $2 + INTERVAL '5 minutes'
            ORDER BY timestamp DESC LIMIT 1
        `;
        const result = await db.query(query, [metric, timestamp || new Date().toISOString()]);
        
        if (result.rows.length > 0) {
            const actual = result.rows[0].value;
            const tolerance = 0.1; // 10% tolerance
            const matched = Math.abs(actual - claimedValue) / Math.max(Math.abs(actual), 1) <= tolerance;
            
            return {
                metric,
                claimedValue,
                actualValue: actual,
                matched,
                source: 'database',
                reason: matched ? null : `Database shows ${actual}, agent claimed ${claimedValue}`
            };
        }
    } catch (err) {
        console.warn(`[RVE] Database verification failed for ${metric}: ${err.message}`);
    }
    
    return null; // Null means "could not verify against this source"
}

async function verifyAgainstLogs(metric, claimedValue, timestamp, context) {
    // In production: query log aggregation (ELK, Loki, CloudWatch)
    // For now: check if the metric appears in recent audit logs
    try {
        const query = `
            SELECT 1 FROM audit_trail 
            WHERE issue_type LIKE $1 
            AND created_at >= NOW() - INTERVAL '1 hour'
            LIMIT 1
        `;
        const result = await db.query(query, [`%${metric}%`]);
        
        if (result.rows.length > 0) {
            return {
                metric,
                claimedValue,
                actualValue: claimedValue, // Log confirms existence but not exact value
                matched: true,
                source: 'logs',
                reason: null
            };
        }
    } catch (err) {
        // Log store unavailable
    }
    
    return null;
}

async function verifyAgainstMetrics(metric, claimedValue, timestamp, context) {
    // In production: query Prometheus, Datadog, CloudWatch Metrics
    // For now: return null (not implemented)
    return null;
}

async function checkReferenceExists(reference, dataSources) {
    if (!reference) return false;
    
    // URL reference
    if (reference.startsWith('http')) {
        try {
            const response = await fetch(reference, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
            return response.ok;
        } catch {
            return false;
        }
    }
    
    // Database reference (document, config, log)
    if (dataSources.includes('database')) {
        try {
            const query = `SELECT 1 FROM documents WHERE reference = $1 LIMIT 1`;
            const result = await db.query(query, [reference]);
            return result.rows.length > 0;
        } catch {
            return false;
        }
    }
    
    return false;
}

// =============================================================================
// EXECUTION DECISION
// =============================================================================

function determineExecutionDecision(chain, results, strictMode) {
    const verified = results.filter(r => r.status === 'verified').length;
    const contradicted = results.filter(r => r.status === 'contradicted').length;
    const hallucinated = results.filter(r => r.status === 'hallucinated').length;
    const total = results.length || 1;
    
    const verificationScore = verified / total;
    const contaminationScore = (contradicted + hallucinated) / total;
    
    // Critical actions require higher scrutiny
    const hasExecutableClaims = chain.triples.some(t => t.claim.actionability === 'executable');
    const hasCriticalFallacies = chain.fallacies.some(f => f.severity === 'critical');
    const hasCircularReasoning = chain.circularReferences.length > 0;
    
    // Decision matrix
    if (hasCircularReasoning) {
        return {
            decision: 'block',
            reason: 'Circular reasoning detected',
            riskLevel: 'critical'
        };
    }
    
    if (hasCriticalFallacies && strictMode) {
        return {
            decision: 'block',
            reason: `${chain.fallacies.filter(f => f.severity === 'critical').length} critical logical fallacies detected`,
            riskLevel: 'critical'
        };
    }
    
    if (contaminationScore > 0.5) {
        return {
            decision: 'block',
            reason: `${Math.round(contaminationScore * 100)}% of claims contradicted or hallucinated`,
            riskLevel: 'critical'
        };
    }
    
    if (verificationScore < 0.3) {
        return {
            decision: 'block',
            reason: `Only ${Math.round(verificationScore * 100)}% of claims verified`,
            riskLevel: 'high'
        };
    }
    
    if (hasExecutableClaims && verificationScore < 0.7) {
        return {
            decision: 'require_approval',
            reason: 'Executable claims present but verification score below threshold',
            riskLevel: 'high'
        };
    }
    
    if (verificationScore >= 0.7 && contaminationScore < 0.2) {
        return {
            decision: hasExecutableClaims ? 'require_approval' : 'allow',
            reason: hasExecutableClaims ? 'Executable claims verified — requires human approval' : 'Reasoning verified — safe to proceed',
            riskLevel: hasExecutableClaims ? 'medium' : 'low'
        };
    }
    
    // Default: require approval
    return {
        decision: 'require_approval',
        reason: 'Verification inconclusive — human review recommended',
        riskLevel: 'medium'
    };
}

// =============================================================================
// SUMMARY GENERATOR
// =============================================================================

function generateSummary(chain, results, decision) {
    const verified = results.filter(r => r.status === 'verified').length;
    const contradicted = results.filter(r => r.status === 'contradicted').length;
    const hallucinated = results.filter(r => r.status === 'hallucinated').length;
    
    return {
        agent: chain.agent,
        claimsTotal: chain.triples.length,
        claimsWithEvidence: chain.triples.filter(t => t.evidence.length > 0).length,
        claimsWithoutEvidence: chain.missingEvidence.length,
        verifiedClaims: verified,
        contradictedClaims: contradicted,
        hallucinatedClaims: hallucinated,
        fallaciesDetected: chain.fallacies.length,
        circularReferences: chain.circularReferences.length,
        claimEvolutions: chain.claimEvolution?.length || 0,
        overallConfidence: chain.overallConfidence,
        verificationScore: results.length > 0 ? verified / results.length : 0,
        executionDecision: decision.decision,
        riskLevel: decision.riskLevel,
        recommendation: decision.decision === 'block' 
            ? 'Do not execute. Reasoning chain contains critical errors.'
            : decision.decision === 'require_approval'
            ? 'Human review required before execution.'
            : 'Reasoning verified. Safe to proceed.'
    };
}

// =============================================================================
// EXPORTS
// =============================================================================

export { verifyReasoningChain, verifyTriple, verifyEvidence, verifyDataPoint, determineExecutionDecision };
