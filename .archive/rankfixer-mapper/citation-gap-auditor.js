// citation-gap-auditor.js
// Site Mapper v3 — Citation-Gap Auditor
// Measures citation-worthiness for Generative Engine Optimization (GEO).
// Compares your content against AI-cited competitors to find attribution gaps.

import { normalizeUrl } from './crawler.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

// Fact-density claim detection pattern
const CLAIM_PATTERN = /(\d+[.,]\d+|\d{2,}\s*(?:%|percent|kg|cm|mm|billion|million|thousand))|(?:according to|reported by|says|stated by|published in|source:|per\s+the|research by|study by|data from)|https?:\/\/[^\s)>]+/gi;

// Expected schema types per page type
const EXPECTED_SCHEMA = {
    product: {
        types: ['Product', 'Offer', 'Review', 'AggregateRating'],
        properties: ['name', 'description', 'price', 'priceCurrency', 'availability', 'reviewCount', 'ratingValue']
    },
    article: {
        types: ['Article', 'BlogPosting', 'Author', 'Organization'],
        properties: ['headline', 'datePublished', 'dateModified', 'author.name', 'publisher.name', 'image']
    },
    faq: {
        types: ['FAQPage', 'Question', 'Answer'],
        properties: ['name', 'text', 'acceptedAnswer']
    },
    organization: {
        types: ['Organization', 'WebSite', 'LocalBusiness'],
        properties: ['name', 'url', 'sameAs', 'logo', 'description', 'address']
    },
    homepage: {
        types: ['Organization', 'WebSite'],
        properties: ['name', 'url', 'description', 'sameAs']
    }
};

// Attribution detection
const ATTRIBUTION_PATTERN = /(?:according to|says|stated by|reported by|research by|study by|data from|per\s+the|as\s+noted\s+by|cited\s+by|published\s+by)\s+(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/gi;

// Inline citation patterns
const INLINE_CITE_PATTERN = /<cite[^>]*>|<blockquote[^>]*>|<q[^>]*>/gi;

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Audit citation gap between your page and AI-cited competitors.
 * 
 * @param {string} query - The search query/topic
 * @param {string} myUrl - Your page URL
 * @param {string} myHtml - Your page HTML content
 * @param {Array} competitors - Array of { url, html } for AI-cited competitor pages
 * @param {string} pageType - Your page type (product, article, faq, etc.)
 * @returns {object} Gap report
 */
export function auditCitationGap(query, myUrl, myHtml, competitors = [], pageType = 'article') {
    console.log(`[CitationGap] Auditing: "${query}"`);
    console.log(`[CitationGap] My page: ${myUrl} (${pageType})`);
    console.log(`[CitationGap] Competitors: ${competitors.length} pages`);

    // 1. Score your page
    const myMetrics = analyzeContent(myHtml, pageType);
    const myCWS = calculateCWS(myMetrics);

    // 2. Score competitor pages
    const competitorScores = competitors.map(c => {
        const metrics = analyzeContent(c.html, pageType);
        return {
            url: c.url,
            cws: calculateCWS(metrics),
            metrics
        };
    });

    // 3. Calculate averages
    const competitorAvgCWS = competitorScores.length > 0
        ? competitorScores.reduce((s, c) => s + c.cws, 0) / competitorScores.length
        : 0;

    const gap = competitorAvgCWS - myCWS;

    // 4. Detect specific gaps
    const gaps = detectGaps(myMetrics, competitorScores, pageType);

    // 5. Build report
    const report = {
        query,
        myUrl,
        pageType,
        timestamp: new Date().toISOString(),
        scores: {
            myCWS: round(myCWS),
            competitorAvgCWS: round(competitorAvgCWS),
            gap: round(gap),
            status: gap > 0.20 ? 'critical_gap' : gap > 0.10 ? 'moderate_gap' : gap > 0 ? 'minor_gap' : 'leading'
        },
        myMetrics: {
            fds: round(myMetrics.fds),
            aee: round(myMetrics.aeeScore),
            scs: round(myMetrics.scsScore),
            as: round(myMetrics.asScore)
        },
        competitorMetrics: competitorScores.length > 0 ? {
            avgFDS: round(competitorScores.reduce((s, c) => s + c.metrics.fds, 0) / competitorScores.length),
            avgAEE: round(competitorScores.reduce((s, c) => s + c.metrics.aeeScore, 0) / competitorScores.length),
            avgSCS: round(competitorScores.reduce((s, c) => s + c.metrics.scsScore, 0) / competitorScores.length),
            avgAS: round(competitorScores.reduce((s, c) => s + c.metrics.asScore, 0) / competitorScores.length)
        } : null,
        gaps,
        topCompetitor: competitorScores.length > 0 
            ? competitorScores.sort((a, b) => b.cws - a.cws)[0].url 
            : null
    };

    console.log(`[CitationGap] My CWS: ${round(myCWS)} | Competitor Avg: ${round(competitorAvgCWS)} | Gap: ${round(gap)}`);
    console.log(`[CitationGap] ${gaps.length} gaps found (${gaps.filter(g => g.priority === 'critical').length} critical)`);

    return report;
}

// =============================================================================
// CONTENT ANALYSIS
// =============================================================================

/**
 * Analyze content for all GEO citation signals.
 */
function analyzeContent(html, pageType = 'article') {
    // Extract main content (strip nav, footer, scripts, styles)
    const mainContent = extractMainContent(html);
    const text = stripHtml(mainContent);
    const totalWords = text.split(/\s+/).filter(w => w.length > 0).length;

    // 1. Fact-Density Score (FDS)
    const fdsMetrics = calculateFDS(text, totalWords);

    // 2. Answer-Explain-Expand Score (AEE)
    const aeeScore = calculateAEE(mainContent, text);

    // 3. Schema Completeness Score (SCS)
    const scsScore = calculateSCS(html, pageType);

    // 4. Attribution Score (AS)
    const asScore = calculateAS(text, mainContent, fdsMetrics.citedClaims);

    return {
        totalWords,
        fds: fdsMetrics.fds,
        citedClaims: fdsMetrics.citedClaims,
        structuredDataPoints: fdsMetrics.structuredDataPoints,
        aeeScore,
        scsScore,
        asScore
    };
}

// =============================================================================
// 1. FACT-DENSITY SCORE (FDS) — Weight: 35%
// =============================================================================

function calculateFDS(text, totalWords) {
    if (totalWords === 0) return { fds: 0, citedClaims: 0, structuredDataPoints: 0 };

    // Count verifiable claims
    const matches = [...text.matchAll(CLAIM_PATTERN)];
    const citedClaims = matches.length;

    // Count structured data points (schema JSON-LD properties with values)
    const structuredDataPoints = countSchemaProperties(text);

    const fds = ((citedClaims + structuredDataPoints) / totalWords) * 1000;

    return { fds, citedClaims, structuredDataPoints };
}

function countSchemaProperties(text) {
    // Count JSON-LD schema properties that have actual values
    let count = 0;
    const schemaMatches = text.match(/"@type"\s*:\s*"[^"]+"/gi) || [];
    count += schemaMatches.length * 2; // Each type implies multiple properties

    // Count populated properties
    const propMatches = text.match(/"(?:name|description|price|datePublished|author|headline|url|sameAs|image)"\s*:\s*"[^"]{2,}"/gi) || [];
    count += propMatches.length;

    return count;
}

// =============================================================================
// 2. ANSWER-EXPLAIN-EXPAND SCORE (AEE) — Weight: 25%
// =============================================================================

function calculateAEE(mainContent, text) {
    let directAnswer = 0;
    let evidenceCount = 0;
    let expandDepth = 0;

    // Direct answer: First substantive element after H1 answers a clear question
    const firstParagraph = mainContent.match(/(?:<p[^>]*>|<\/h1>)([\s\S]{50,500}?)(?:<\/p>|<h[2-6])/i);
    if (firstParagraph) {
        const content = stripHtml(firstParagraph[1]).trim();
        // Check if it's a declarative sentence that could answer a question
        if (content.length > 50 && /^[A-Z]/.test(content) && /[.!?]$/.test(content)) {
            directAnswer = 1;
        } else if (content.length > 30) {
            directAnswer = 0.5;
        }
    }

    // Evidence: blockquotes, citations, data points in content
    const citeElements = (mainContent.match(INLINE_CITE_PATTERN) || []).length;
    const statsInContent = (text.match(/\d{2,}[%]|\$\d+|\d+\.\d+/g) || []).length;
    evidenceCount = Math.min((citeElements + statsInContent) / 5, 1); // Normalize to 0-1

    // Expand depth: heading hierarchy
    const h2Count = (mainContent.match(/<h2[^>]*>/gi) || []).length;
    const h3Count = (mainContent.match(/<h3[^>]*>/gi) || []).length;
    const h4Count = (mainContent.match(/<h4[^>]*>/gi) || []).length;

    if (h4Count > 0 && h3Count > 0) expandDepth = 1;
    else if (h3Count > 0) expandDepth = 0.5;
    else if (h2Count > 0) expandDepth = 0.25;

    return round((directAnswer + evidenceCount + expandDepth) / 3);
}

// =============================================================================
// 3. SCHEMA COMPLETENESS SCORE (SCS) — Weight: 25%
// =============================================================================

function calculateSCS(html, pageType) {
    const expected = EXPECTED_SCHEMA[pageType] || EXPECTED_SCHEMA['article'];
    
    // Check which expected types are present
    let typesFound = 0;
    for (const type of expected.types) {
        if (html.includes(`"@type":"${type}"`) || html.includes(`"@type": "${type}"`)) {
            typesFound++;
        }
    }
    const typeRatio = expected.types.length > 0 ? typesFound / expected.types.length : 0;

    // Check which expected properties are populated
    let propsFound = 0;
    for (const prop of expected.properties) {
        const regex = new RegExp(`"${prop}"\\s*:\\s*"[^"]{1,}"`, 'i');
        if (regex.test(html)) propsFound++;
    }
    const propRatio = expected.properties.length > 0 ? propsFound / expected.properties.length : 0;

    return round(typeRatio * propRatio);
}

// =============================================================================
// 4. ATTRIBUTION SCORE (AS) — Weight: 15%
// =============================================================================

function calculateAS(text, mainContent, totalClaims) {
    if (totalClaims === 0) return 0;

    // Count inline attributions
    const attributions = [...text.matchAll(ATTRIBUTION_PATTERN)];
    const inlineAttributions = attributions.length;

    // Count unique external domains linked
    const externalLinks = mainContent.match(/href\s*=\s*["']https?:\/\/([^"'\s/]+)/gi) || [];
    const domains = new Set();
    for (const link of externalLinks) {
        const domainMatch = link.match(/https?:\/\/([^"'\s/]+)/i);
        if (domainMatch) domains.add(domainMatch[1].replace(/^www\./, ''));
    }

    const as = (inlineAttributions + domains.size) / Math.max(totalClaims, 1);
    return Math.min(as, 1); // Cap at 1.0
}

// =============================================================================
// COMPOSITE CITATION-WORTHINESS SCORE (CWS)
// =============================================================================

function calculateCWS(metrics) {
    const nFDS = Math.min(metrics.fds / 10, 1);
    const nAEE = metrics.aeeScore;
    const nSCS = metrics.scsScore;
    const nAS = metrics.asScore;

    return (nFDS * 0.35) + (nAEE * 0.25) + (nSCS * 0.25) + (nAS * 0.15);
}

// =============================================================================
// GAP DETECTION
// =============================================================================

function detectGaps(myMetrics, competitorScores, pageType) {
    if (competitorScores.length === 0) return [];

    const gaps = [];
    const avg = (arr, key) => arr.reduce((s, c) => s + c.metrics[key], 0) / arr.length;

    // FDS gap
    const avgFDS = avg(competitorScores, 'fds');
    const fdsGap = avgFDS - myMetrics.fds;
    if (fdsGap > 1.0) {
        gaps.push({
            type: 'fact_density',
            myScore: round(myMetrics.fds),
            competitorAvg: round(avgFDS),
            gap: round(fdsGap),
            priority: fdsGap > 4 ? 'critical' : fdsGap > 2 ? 'high' : 'moderate',
            remediation: `Add ${Math.ceil(fdsGap * myMetrics.totalWords / 1000)} more cited statistics or data points with inline sources`
        });
    }

    // AEE gap
    const avgAEE = avg(competitorScores, 'aeeScore');
    const aeeGap = avgAEE - myMetrics.aeeScore;
    if (aeeGap > 0.1) {
        gaps.push({
            type: 'answer_explain_expand',
            myScore: round(myMetrics.aeeScore),
            competitorAvg: round(avgAEE),
            gap: round(aeeGap),
            priority: aeeGap > 0.3 ? 'high' : 'moderate',
            remediation: 'Restructure content: lead with direct answer, add supporting evidence, use H2→H3→H4 hierarchy'
        });
    }

    // SCS gap
    const avgSCS = avg(competitorScores, 'scsScore');
    const scsGap = avgSCS - myMetrics.scsScore;
    if (scsGap > 0.1) {
        const expected = EXPECTED_SCHEMA[pageType] || EXPECTED_SCHEMA['article'];
        gaps.push({
            type: 'schema_completeness',
            myScore: round(myMetrics.scsScore),
            competitorAvg: round(avgSCS),
            gap: round(scsGap),
            priority: scsGap > 0.4 ? 'critical' : scsGap > 0.2 ? 'high' : 'moderate',
            remediation: `Add missing schema types: ${expected.types.join(', ')}. Populate: ${expected.properties.join(', ')}`
        });
    }

    // AS gap
    const avgAS = avg(competitorScores, 'asScore');
    const asGap = avgAS - myMetrics.asScore;
    if (asGap > 0.1) {
        gaps.push({
            type: 'attribution',
            myScore: round(myMetrics.asScore),
            competitorAvg: round(avgAS),
            gap: round(asGap),
            priority: asGap > 0.3 ? 'high' : 'moderate',
            remediation: 'Name sources inline: "According to [Expert] at [Organization]" and link to external references'
        });
    }

    // Sort by priority
    const order = { critical: 0, high: 1, moderate: 2 };
    gaps.sort((a, b) => order[a.priority] - order[b.priority]);

    return gaps;
}

// =============================================================================
// HELPERS
// =============================================================================

function extractMainContent(html) {
    // Remove scripts, styles, nav, footer, headers
    let content = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
        .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '');

    // If content is empty after stripping, use original
    if (content.length < 200) content = html;
    return content;
}

function stripHtml(html) {
    return html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function round(num) {
    return Math.round(num * 100) / 100;
}

// =============================================================================
// EXPORTS
// =============================================================================

export { 
    auditCitationGap, 
    analyzeContent, 
    calculateCWS, 
    calculateFDS, 
    calculateAEE, 
    calculateSCS, 
    calculateAS,
    CLAIM_PATTERN,
    EXPECTED_SCHEMA
};
