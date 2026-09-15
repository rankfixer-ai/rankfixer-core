// audit-report-v2.js
// Site Mapper v2 — Orchestrator (Phase 11)

import { classify } from './site-classifier.js';
import { discoverUrls } from './url-discoverer.js';
import { discoverTemplates, refineTemplateClassification } from './template-discoverer.js';
import { buildGraph, finalizeGraph } from './graph-builder.js';
import { detectContradictions } from './contradiction-engine.js';
import { extrapolateFindings } from './extrapolator.js';
import fs from 'fs';

async function fetchEntry(url) {
    const r = await fetch(url, {
        redirect: 'follow',
        headers: { 'User-Agent': 'SiteMapper/2.0', 'Accept-Language': 'en-US,en;q=0.9' }
    });
    return { html: await r.text(), finalUrl: r.url, statusCode: r.status };
}

async function crawlSamples(urls) {
    const results = [];
    for (const url of urls) {
        try {
            const r = await fetch(url, {
                redirect: 'follow',
                headers: { 'User-Agent': 'SiteMapper/2.0', 'Accept-Language': 'en-US,en;q=0.9' }
            });
            results.push({
                url, finalUrl: r.url, html: await r.text(),
                statusCode: r.status, depth: 0, robotsBlocked: false, error: null
            });
        } catch (e) {
            results.push({
                url, finalUrl: url, html: null,
                statusCode: 0, depth: 0, robotsBlocked: false, error: e.message
            });
        }
    }
    return results;
}

export async function runDeepAuditV2(entryUrl) {
    const t0 = Date.now();
    console.log(`\n═══ Site Mapper v2 ═══\nTarget: ${entryUrl}\n`);

    console.log('[1] Fetching entry page...');
    const entry = await fetchEntry(entryUrl);

    console.log('[2] Classifying site...');
    const cls = classify(entry.html, entry.finalUrl || entryUrl);
    console.log(`    archetype=${cls.archetype} requiresJSRendering=${cls.requiresJSRendering}`);

    console.log('[3] Discovering URLs...');
    const disc = await discoverUrls(entry.finalUrl || entryUrl, entry.html, cls);
    console.log(`    ${disc.stats.totalUrls} URLs (${disc.stats.sitemapUrls} sitemap, ${disc.stats.crawlUrls} crawl)`);

    console.log('[4-5] Discovering templates...');
    const tpl = discoverTemplates(disc.urls, entry.finalUrl || entryUrl);
    console.log(`    ${tpl.stats.totalTemplates} templates, ${tpl.stats.totalSamples} samples`);

    console.log('[6] Crawling samples...');
    const pages = await crawlSamples(tpl.samples);
    console.log(`    ${pages.filter(p => p.html).length}/${pages.length} fetched successfully`);

    console.log('[5b] Refining template classifications...');
    const refined = tpl.templates.map(t => {
        const templateSamples = pages.filter(p =>
            t.samples.some(s => normalizeForCompare(s) === normalizeForCompare(p.url))
        );
        return refineTemplateClassification(t, templateSamples);
    });
    for (const t of refined) {
        console.log(`    ${t.pattern} → ${t.pageType} (${t.instanceCount} pages, confidence: ${t.classificationConfidence || 'high'})`);
    }

    console.log('[7-8] Building graph...');
    const { graph, stats } = buildGraph(pages, entry.finalUrl || entryUrl);
    const fg = finalizeGraph(graph);
    console.log(`    ${stats.totalNodes} nodes, ${stats.totalEdges} edges, ${stats.orphanNodes} orphans`);

    console.log('[9] Detecting contradictions...');
    const contradictions = detectContradictions(fg, '', []);
    console.log(`    ${contradictions.length} contradictions (${contradictions.filter(c => c.severity === 'critical').length} critical)`);

    console.log('[10] Extrapolating findings...');
    const withIssues = extrapolateFindings(refined, contradictions, fg);

    const d = ((Date.now() - t0) / 1000).toFixed(1);

    const report = {
        meta: {
            scanDate: new Date().toISOString(),
            entryUrl: entryUrl,
            duration: `${d}s`,
            version: '2.0.0'
        },
        site: {
            archetype: cls.archetype,
            requiresJSRendering: cls.requiresJSRendering,
            totalPages: disc.stats.totalUrls,
            templatesDiscovered: refined.length,
            pagesSampled: tpl.stats.totalSamples,
            pagesCrawledSuccessfully: pages.filter(p => p.html).length
        },
        templates: withIssues.map(t => ({
            pattern: t.pattern,
            pageType: t.pageType,
            instanceCount: t.instanceCount,
            samplesCrawled: t.sampleCount,
            confidence: t.classificationConfidence || 'high',
            templateIssues: t.templateIssues.map(i => ({
                type: i.type || i.subtype,
                severity: i.severity,
                message: i.message,
                confidence: i.confidence || 'medium',
                estimatedAffectedPages: i.estimatedAffectedPages || t.instanceCount,
                recommendation: i.recommendation
            })),
            pageIssues: t.pageIssues.map(i => ({
                type: i.type || i.subtype,
                severity: i.severity,
                message: i.message,
                affectedUrls: i.affectedUrls
            }))
        })),
        globalContradictions: contradictions
            .filter(c => !withIssues.some(t => t.templateIssues.some(ti => ti.subtype === c.subtype)))
            .map(c => ({
                type: c.subtype,
                severity: c.severity,
                message: c.message,
                affectedUrls: c.affectedUrls,
                recommendation: c.recommendation
            })),
        graphSummary: {
            nodeCount: stats.totalNodes,
            edgeCount: stats.totalEdges,
            orphanCount: stats.orphanNodes
        },
        discovery: {
            sitemapUrls: disc.stats.sitemapUrls,
            crawlUrls: disc.stats.crawlUrls,
            sitemapOnly: disc.stats.sitemapOnly,
            crawlOnly: disc.stats.crawlOnly,
            overlap: disc.stats.overlap || (disc.stats.totalUrls - disc.stats.sitemapOnly - disc.stats.crawlOnly)
        }
    };

    console.log(`\n[11] Report assembled: ${d}s`);
    console.log(`    Templates: ${report.templates.length}`);
    console.log(`    Global contradictions: ${report.globalContradictions.length}`);
    console.log(`    Template issues: ${report.templates.reduce((s, t) => s + t.templateIssues.length, 0)}`);
    console.log(`    Page issues: ${report.templates.reduce((s, t) => s + t.pageIssues.length, 0)}\n`);

    return report;
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
