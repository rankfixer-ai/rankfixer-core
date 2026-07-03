// extrapolator.js
// Site Mapper v2 — Extrapolator (Phase 10)
// Extrapolates sample-level findings to template-level issues.

export function extrapolateFindings(templates, contradictions, graph) {
    console.log('[Extrapolator] Extrapolating findings to template level...');

    const extrapolated = [];
    let totalTemplateIssues = 0;
    let totalPageIssues = 0;

    for (const template of templates) {
        const templateContradictions = [];
        const pageContradictions = [];

        for (const contradiction of contradictions) {
            const affectedSamples = contradiction.affectedUrls.filter(url =>
                template.samples.some(sample => normalizeForCompare(sample) === normalizeForCompare(url))
            );

            if (affectedSamples.length === 0) continue;

            if (affectedSamples.length >= 2 || (template.sampleCount === 1 && affectedSamples.length === 1 && template.instanceCount > 3)) {
                templateContradictions.push({
                    ...contradiction,
                    confidence: affectedSamples.length >= 3 ? 'high' : affectedSamples.length === 2 ? 'medium' : 'low',
                    affectedSamples: affectedSamples,
                    estimatedAffectedPages: estimateAffectedPages(affectedSamples.length, template.sampleCount, template.instanceCount),
                    isTemplateIssue: true
                });
            } else {
                pageContradictions.push({ ...contradiction, isTemplateIssue: false });
            }
        }

        const sampleNodes = [...graph.values()].filter(node =>
            template.samples.some(s => normalizeForCompare(node.identity) === normalizeForCompare(s))
        );

        const commonIssues = findCommonSampleIssues(sampleNodes, template);
        for (const issue of commonIssues) {
            const alreadyCovered = templateContradictions.some(c => c.subtype === issue.type);
            if (!alreadyCovered) templateContradictions.push(issue);
        }

        totalTemplateIssues += templateContradictions.length;
        totalPageIssues += pageContradictions.length;

        extrapolated.push({
            ...template,
            templateIssues: templateContradictions,
            pageIssues: pageContradictions,
            issueCount: templateContradictions.length + pageContradictions.length
        });
    }

    console.log(`[Extrapolator] ${totalTemplateIssues} template-level issues, ${totalPageIssues} page-level issues`);
    return extrapolated;
}

function findCommonSampleIssues(sampleNodes, template) {
    const issues = [];
    if (sampleNodes.length < 2) return issues;

    const missingH1Count = sampleNodes.filter(n => !n.h1).length;
    if (missingH1Count >= 2) {
        issues.push({
            type: 'missing-h1', subtype: 'missing-h1', severity: 'critical',
            message: `${missingH1Count}/${sampleNodes.length} samples missing H1 tag`,
            confidence: missingH1Count >= sampleNodes.length - 1 ? 'high' : 'medium',
            estimatedAffectedPages: estimateAffectedPages(missingH1Count, sampleNodes.length, template.instanceCount),
            recommendation: 'Add H1 tag to this template.'
        });
    }

    const titles = sampleNodes.map(n => n.title).filter(Boolean);
    const uniqueTitles = new Set(titles.map(t => t.toLowerCase().trim()));
    if (uniqueTitles.size === 1 && titles.length >= 2) {
        issues.push({
            type: 'duplicate-title', subtype: 'duplicate-title', severity: 'critical',
            message: `All ${titles.length} samples have identical title: "${titles[0]}"`,
            confidence: 'high',
            estimatedAffectedPages: template.instanceCount,
            recommendation: 'Use unique titles for each page in this template.'
        });
    }

    const missingDescCount = sampleNodes.filter(n => !n.metaDescription).length;
    if (missingDescCount >= 2) {
        issues.push({
            type: 'missing-meta-description', subtype: 'missing-meta-description', severity: 'warning',
            message: `${missingDescCount}/${sampleNodes.length} samples missing meta description`,
            confidence: missingDescCount >= sampleNodes.length - 1 ? 'high' : 'medium',
            estimatedAffectedPages: estimateAffectedPages(missingDescCount, sampleNodes.length, template.instanceCount),
            recommendation: 'Add meta descriptions to this template.'
        });
    }

    const thinContentCount = sampleNodes.filter(n => n.contentSize < 100).length;
    if (thinContentCount >= 2) {
        issues.push({
            type: 'thin-content', subtype: 'thin-content', severity: 'warning',
            message: `${thinContentCount}/${sampleNodes.length} samples have thin content (< 100 words)`,
            confidence: thinContentCount >= sampleNodes.length - 1 ? 'high' : 'medium',
            estimatedAffectedPages: estimateAffectedPages(thinContentCount, sampleNodes.length, template.instanceCount),
            recommendation: 'Add more content to pages using this template.'
        });
    }

    return issues;
}

function estimateAffectedPages(affectedSamples, totalSamples, totalInstances) {
    if (totalSamples === totalInstances) return totalInstances;
    const ratio = affectedSamples / totalSamples;
    if (ratio >= 0.9) return totalInstances;
    if (ratio >= 0.66) return Math.round(totalInstances * 0.8);
    if (ratio >= 0.5) return Math.round(totalInstances * 0.5);
    return affectedSamples;
}

function normalizeForCompare(url) {
    try {
        const parsed = new URL(url);
        parsed.hash = '';
        parsed.hostname = parsed.hostname.toLowerCase();
        let normalized = parsed.toString();
        if (normalized.endsWith('/') && parsed.pathname !== '/') normalized = normalized.slice(0, -1);
        return normalized;
    } catch {
        return url;
    }
}
