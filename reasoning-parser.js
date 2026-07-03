// reasoning-parser.js — v2
// RVE — Reasoning Verification Engine: Parser
// Extracts structured [Claim, Evidence, Inference] triples.
// v2: Handles conflicting evidence and contextual drift.

// ... [all previous code from the original parser remains unchanged up to associateTriples] ...

// =============================================================================
// ASSOCIATION — Build triples from extracted pieces (v2: conflict-aware)
// =============================================================================

function associateTriples(claims, evidence, inferences, rawText) {
    const triples = [];
    
    for (let i = 0; i < claims.length; i++) {
        const claim = claims[i];
        claim.sequencePosition = i;
        
        const claimPos = rawText.indexOf(claim.text);
        
        // Find evidence near this claim
        const nearbyEvidence = evidence.filter(e => {
            const evPos = rawText.indexOf(e.text);
            return evPos >= 0 && Math.abs(evPos - claimPos) < 500;
        });
        
        // Detect evidence contradictions within the same claim
        const evidenceContradictions = detectEvidenceContradictions(nearbyEvidence);
        
        const nearbyInference = inferences.find(inf => {
            const infPos = rawText.indexOf(inf.structure);
            return infPos >= 0 && Math.abs(infPos - claimPos) < 300;
        });
        
        triples.push({
            id: `triple-${i}-${Date.now()}`,
            claim,
            evidence: nearbyEvidence,
            evidenceContradictions,      // NEW: conflicting evidence flagged
            inference: nearbyInference || {
                type: 'abductive',
                structure: 'implicit',
                validity: 'uncertain',
                gapDescription: 'No explicit inference structure detected'
            },
            confidence: calculateTripleConfidence(claim, nearbyEvidence, nearbyInference, evidenceContradictions),
            verificationStatus: 'unverified'
        });
    }
    
    return triples;
}

// =============================================================================
// EVIDENCE CONTRADICTION DETECTION
// =============================================================================

function detectEvidenceContradictions(evidenceItems) {
    if (evidenceItems.length < 2) return [];
    
    const contradictions = [];
    
    for (let i = 0; i < evidenceItems.length; i++) {
        for (let j = i + 1; j < evidenceItems.length; j++) {
            const a = evidenceItems[i];
            const b = evidenceItems[j];
            
            // Contradiction: one verifiable, one hallucinated
            if (a.verifiability === 'verifiable' && b.verifiability === 'hallucinated') {
                contradictions.push({
                    type: 'source_conflict',
                    verifiableEvidence: a.text,
                    hallucinatedEvidence: b.text,
                    description: 'Agent cites both verifiable and hallucinated evidence for the same claim',
                    severity: 'critical'
                });
            }
            
            // Contradiction: conflicting data points
            if (a.dataPoints.length > 0 && b.dataPoints.length > 0) {
                for (const dpA of a.dataPoints) {
                    for (const dpB of b.dataPoints) {
                        if (dpA.metric === dpB.metric && Math.abs(dpA.value - dpB.value) / Math.max(dpA.value, 1) > 0.5) {
                            contradictions.push({
                                type: 'data_conflict',
                                metric: dpA.metric,
                                valueA: dpA.value,
                                valueB: dpB.value,
                                description: `Conflicting values for ${dpA.metric}: ${dpA.value} vs ${dpB.value}`,
                                severity: 'critical'
                            });
                        }
                    }
                }
            }
        }
    }
    
    return contradictions;
}

// =============================================================================
// CONTEXTUAL DRIFT DETECTION
// =============================================================================

function detectClaimEvolution(triples) {
    const entityStates = new Map(); // entity → [{ claimId, state, position }]
    const evolutions = [];
    
    for (const triple of triples) {
        const entities = triple.claim.entities;
        const claimText = triple.claim.text.toLowerCase();
        const position = triple.claim.sequencePosition || 0;
        
        // Extract entity state from claim
        const statePatterns = [
            { pattern: /\b(is|are)\s+(down|failing|broken|offline|unavailable|degraded)\b/gi, state: 'degraded' },
            { pattern: /\b(is|are)\s+(up|running|healthy|online|available|operational)\b/gi, state: 'healthy' },
            { pattern: /\b(has|have)\s+(recovered|restored|healed|fixed|resolved)\b/gi, state: 'healthy' },
            { pattern: /\b(has|have)\s+(failed|crashed|stopped|died)\b/gi, state: 'degraded' },
        ];
        
        let detectedState = null;
        for (const { pattern, state } of statePatterns) {
            if (pattern.test(claimText)) {
                detectedState = state;
                break;
            }
        }
        
        if (!detectedState) continue;
        
        for (const entity of entities) {
            const entityKey = entity.toLowerCase();
            
            if (!entityStates.has(entityKey)) {
                entityStates.set(entityKey, []);
            }
            
            const history = entityStates.get(entityKey);
            
            // Check if state changed from previous assertion
            if (history.length > 0) {
                const lastState = history[history.length - 1];
                if (lastState.state !== detectedState) {
                    evolutions.push({
                        entity: entity,
                        fromState: lastState.state,
                        toState: detectedState,
                        fromClaimId: lastState.claimId,
                        toClaimId: triple.id,
                        fromPosition: lastState.position,
                        toPosition: position,
                        description: `${entity} state changed from "${lastState.state}" to "${detectedState}" during reasoning`,
                        isContradiction: lastState.state === detectedState ? false : 
                            // Degraded → Healthy is recovery (valid evolution)
                            // Healthy → Degraded is new problem (valid evolution)
                            // Both claiming opposite states without time gap is contradiction
                            Math.abs(position - lastState.position) <= 2
                    });
                }
            }
            
            history.push({
                claimId: triple.id,
                state: detectedState,
                position,
                text: claimText.substring(0, 100)
            });
        }
    }
    
    return evolutions;
}

// =============================================================================
// UPDATED CONFIDENCE CALCULATION
// =============================================================================

function calculateTripleConfidence(claim, evidence, inference, contradictions = []) {
    let score = 0.5;
    
    if (evidence.length > 0) {
        const verifiableCount = evidence.filter(e => e.verifiability === 'verifiable').length;
        const hallucinatedCount = evidence.filter(e => e.verifiability === 'hallucinated').length;
        
        // Boost for verifiable evidence
        score += (verifiableCount / evidence.length) * 0.3;
        // Penalty for hallucinated evidence
        score -= (hallucinatedCount / evidence.length) * 0.2;
    } else {
        score -= 0.3;
    }
    
    // Penalty for evidence contradictions
    if (contradictions.length > 0) {
        score -= contradictions.length * 0.15;
    }
    
    if (inference?.validity === 'valid') score += 0.1;
    if (inference?.validity === 'invalid') score -= 0.2;
    if (claim.quantifiers.length > 0) score += 0.1;
    if (claim.entities.length > 0) score += 0.05;
    
    return Math.max(0, Math.min(1, score));
}

// =============================================================================
// UPDATED MAIN PARSER
// =============================================================================

export function parseReasoningChain(rawText, options = {}) {
    const { agent = 'unknown', actionContext = {} } = options;
    
    console.log(`[RVE Parser] Parsing ${rawText.length} chars from ${agent}`);
    
    const claims = extractClaims(rawText);
    const evidence = extractEvidence(rawText);
    const inferences = extractInferences(rawText);
    const triples = associateTriples(claims, evidence, inferences, rawText);
    const fallacies = detectFallacies(rawText, triples);
    const missingEvidence = triples.filter(t => t.evidence.length === 0).map(t => t.claim);
    const circularReferences = detectCircularReferences(triples);
    const claimEvolution = detectClaimEvolution(triples);  // NEW
    const overallConfidence = calculateOverallConfidence(triples, fallacies);
    
    return {
        id: generateTraceId(),
        agent,
        timestamp: new Date().toISOString(),
        rawText,
        triples,
        overallConfidence,
        fallacies,
        missingEvidence,
        circularReferences,
        claimEvolution,     // NEW: tracks how claims about entities change
        actionContext
    };
}

// ... [all remaining helper functions unchanged] ...
