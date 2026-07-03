// reasoning-remediator.js
// RVE — Reasoning Verification Engine: Auto-Correction Loop
// Takes verification failures and prompts the agent to self-correct.
// Closes the loop: Parse → Verify → Remediate → Re-verify → Execute or Escalate

// =============================================================================
// MAIN AUTO-CORRECTION LOOP
// =============================================================================

/**
 * Attempt to auto-correct a failed reasoning chain.
 * Feeds verification failures back to the agent for reconciliation.
 * Re-verifies after correction. Escalates to human if max attempts exceeded.
 * 
 * @param {ReasoningChain} chain - Original parsed chain
 * @param {VerificationReport} verification - Output from verifyReasoningChain()
 * @param {Function} agentCallback - Function that sends prompt to agent and returns new Chain-of-Thought
 * @param {object} options - { maxAttempts, requireHumanOnFailure }
 * @returns {AutoCorrectionReport}
 */
export async function autoCorrectReasoningChain(chain, verification, agentCallback, options = {}) {
    const { maxAttempts = 3, requireHumanOnFailure = true } = options;
    
    console.log(`[RVE AutoCorrect] Starting correction loop for chain ${chain.id}`);
    console.log(`[RVE AutoCorrect] ${verification.contradicted} contradicted, ${verification.hallucinated} hallucinated`);
    
    let currentChain = chain;
    let currentVerification = verification;
    let attempts = 0;
    const correctionHistory = [];
    
    while (attempts < maxAttempts) {
        // If everything is verified, we're done
        if (currentVerification.contradicted === 0 && currentVerification.hallucinated === 0) {
            console.log(`[RVE AutoCorrect] All claims verified after ${attempts} correction(s)`);
            return {
                success: true,
                finalChain: currentChain,
                finalVerification: currentVerification,
                correctionsApplied: attempts,
                correctionHistory,
                escalatedToHuman: false
            };
        }
        
        attempts++;
        console.log(`[RVE AutoCorrect] Correction attempt ${attempts}/${maxAttempts}`);
        
        // Build the correction prompt
        const correctionPrompt = buildCorrectionPrompt(currentChain, currentVerification);
        
        // Send to agent for self-correction
        let correctedChainOfThought;
        try {
            correctedChainOfThought = await agentCallback(correctionPrompt);
        } catch (err) {
            console.error(`[RVE AutoCorrect] Agent callback failed: ${err.message}`);
            correctionHistory.push({
                attempt: attempts,
                status: 'agent_error',
                error: err.message
            });
            continue;
        }
        
        // Re-parse the corrected output
        const { parseReasoningChain } = await import('./reasoning-parser.js');
        const correctedChain = parseReasoningChain(correctedChainOfThought, {
            agent: chain.agent,
            actionContext: { ...chain.actionContext, correctionAttempt: attempts }
        });
        
        // Re-verify
        const { verifyReasoningChain } = await import('./reasoning-verifier.js');
        const correctedVerification = await verifyReasoningChain(correctedChain, {
            strictMode: attempts >= maxAttempts - 1  // Stricter on final attempt
        });
        
        // Track history
        correctionHistory.push({
            attempt: attempts,
            beforeContradictions: currentVerification.contradicted,
            beforeHallucinations: currentVerification.hallucinated,
            afterContradictions: correctedVerification.contradicted,
            afterHallucinations: correctedVerification.hallucinated,
            improvement: (currentVerification.contradicted + currentVerification.hallucinated) - 
                        (correctedVerification.contradicted + correctedVerification.hallucinated)
        });
        
        // Update for next iteration
        currentChain = correctedChain;
        currentVerification = correctedVerification;
        
        // Check for regression
        if (correctedVerification.verificationScore < verification.verificationScore) {
            console.warn(`[RVE AutoCorrect] Regression detected — stopping correction loop`);
            break;
        }
    }
    
    // Max attempts reached — escalate if required
    const resolved = currentVerification.contradicted === 0 && currentVerification.hallucinated === 0;
    
    return {
        success: resolved,
        finalChain: currentChain,
        finalVerification: currentVerification,
        correctionsApplied: attempts,
        correctionHistory,
        escalatedToHuman: !resolved && requireHumanOnFailure,
        remainingIssues: resolved ? [] : buildEscalationReport(currentChain, currentVerification)
    };
}

// =============================================================================
// CORRECTION PROMPT BUILDER
// =============================================================================

function buildCorrectionPrompt(chain, verification) {
    const failures = [];
    
    // Collect all failed triples with specific details
    for (const result of verification.results) {
        if (result.status === 'verified') continue;
        
        const triple = chain.triples.find(t => t.id === result.tripleId);
        if (!triple) continue;
        
        const failure = {
            claim: triple.claim.text,
            status: result.status,
            reason: result.reason,
            evidenceProblems: []
        };
        
        // Evidence-specific failures
        for (const evResult of result.evidenceResults) {
            if (evResult.status !== 'verified') {
                failure.evidenceProblems.push({
                    evidence: evResult.evidenceText,
                    status: evResult.status,
                    contradiction: evResult.contradiction,
                    // Provide correct data when available
                    corrections: evResult.mismatchedData?.map(d => ({
                        metric: d.metric,
                        claimed: d.claimedValue,
                        actual: d.actualValue
                    })) || []
                });
            }
        }
        
        failures.push(failure);
    }
    
    // Build the structured correction prompt
    const prompt = `
VERIFICATION FAILURE REPORT
===========================
Your previous reasoning chain was verified against live data sources. 
The following claims could not be verified. Please reconcile these discrepancies.

FAILED CLAIMS (${failures.length}):
${failures.map((f, i) => `
[${i + 1}] CLAIM: "${f.claim}"
    STATUS: ${f.status.toUpperCase()}
    REASON: ${f.reason}
    ${f.evidenceProblems.map(ep => `
    EVIDENCE: "${ep.evidence}"
    ISSUE: ${ep.contradiction || ep.status}
    ${ep.corrections.length > 0 ? `CORRECT DATA: ${ep.corrections.map(c => `${c.metric}=${c.actual} (you claimed ${c.claimed})`).join(', ')}` : ''}
    `).join('')}
`).join('')}

INSTRUCTIONS:
1. For each failed claim, either:
   a) Provide corrected reasoning that aligns with the actual data shown above, OR
   b) Explain why the discrepancy exists (e.g., data latency, different time window)
2. If you correct a claim, cite the actual verified data values, not your original values.
3. Do not repeat claims that have been disproven. Replace them with verified assertions.
4. Maintain your original reasoning structure where it was correct.

Please provide your corrected reasoning chain below:
`.trim();
    
    return prompt;
}

// =============================================================================
// ESCALATION REPORT
// =============================================================================

function buildEscalationReport(chain, verification) {
    const issues = [];
    
    for (const result of verification.results) {
        if (result.status === 'verified') continue;
        
        const triple = chain.triples.find(t => t.id === result.tripleId);
        
        issues.push({
            tripleId: result.tripleId,
            claim: result.claim,
            status: result.status,
            actionability: triple?.claim.actionability || 'passive',
            blastRadius: triple?.claim.blastRadius || 0,
            reason: result.reason,
            recommendedAction: triple?.claim.actionability === 'executable' 
                ? 'BLOCK — Executable claim with failed verification'
                : 'FLAG — Review before proceeding'
        });
    }
    
    // Sort by risk: executable + high blast radius first
    issues.sort((a, b) => {
        if (a.actionability === 'executable' && b.actionability !== 'executable') return -1;
        if (b.actionability === 'executable' && a.actionability !== 'executable') return 1;
        return b.blastRadius - a.blastRadius;
    });
    
    return issues;
}

// =============================================================================
// FULL RVE PIPELINE — Parse → Verify → Auto-Correct → Decide
// =============================================================================

/**
 * Run the complete RVE pipeline on an agent's Chain-of-Thought.
 * 
 * @param {string} chainOfThought - Raw Chain-of-Thought from agent
 * @param {Function} agentCallback - Function to send correction prompts back to agent
 * @param {object} options - Full pipeline options
 * @returns {RVEPipelineResult}
 */
export async function runRVEPipeline(chainOfThought, agentCallback, options = {}) {
    const {
        agent = 'unknown',
        actionContext = {},
        maxCorrectionAttempts = 3,
        strictMode = false,
        dataSources = ['database', 'logs', 'metrics'],
        autoCorrect = true
    } = options;
    
    console.log('═══════════════════════════════════════════');
    console.log('  RVE Pipeline — Reasoning Verification');
    console.log(`  Agent: ${agent} | Auto-correct: ${autoCorrect}`);
    console.log('═══════════════════════════════════════════');
    
    // Phase 1: Parse
    console.log('\n[1/4] Parsing reasoning chain...');
    const { parseReasoningChain } = await import('./reasoning-parser.js');
    const chain = parseReasoningChain(chainOfThought, { agent, actionContext });
    console.log(`  ${chain.triples.length} triples, ${chain.fallacies.length} fallacies`);
    
    // Phase 2: Verify
    console.log('\n[2/4] Verifying against data sources...');
    const { verifyReasoningChain } = await import('./reasoning-verifier.js');
    let verification = await verifyReasoningChain(chain, { dataSources, strictMode });
    console.log(`  ${verification.verified} verified, ${verification.contradicted} contradicted, ${verification.hallucinated} hallucinated`);
    
    // Phase 3: Auto-correct (if enabled and needed)
    let correctionReport = null;
    if (autoCorrect && (verification.contradicted > 0 || verification.hallucinated > 0)) {
        console.log('\n[3/4] Auto-correcting...');
        correctionReport = await autoCorrectReasoningChain(chain, verification, agentCallback, {
            maxAttempts: maxCorrectionAttempts,
            requireHumanOnFailure: true
        });
        
        if (correctionReport.success) {
            chain = correctionReport.finalChain;
            verification = correctionReport.finalVerification;
            console.log(`  Corrected after ${correctionReport.correctionsApplied} attempt(s)`);
        } else {
            console.log(`  Could not auto-correct. Escalating to human.`);
        }
    } else {
        console.log('\n[3/4] Auto-correct skipped (not needed or disabled)');
    }
    
    // Phase 4: Final decision
    console.log('\n[4/4] Final execution decision...');
    const decision = verification.executionDecision;
    console.log(`  Decision: ${decision.decision.toUpperCase()} (${decision.riskLevel} risk)`);
    console.log('═══════════════════════════════════════════\n');
    
    return {
        chainId: chain.id,
        agent,
        timestamp: new Date().toISOString(),
        originalChainOfThought: chainOfThought,
        parsedChain: chain,
        verification,
        correctionReport,
        finalDecision: decision,
        requiresHumanReview: decision.decision === 'require_approval' || 
                            decision.decision === 'block' ||
                            (correctionReport?.escalatedToHuman || false),
        summary: verification.summary || chain.summary
    };
}

// =============================================================================
// EXPORTS
// =============================================================================

export { autoCorrectReasoningChain, buildCorrectionPrompt, runRVEPipeline };
