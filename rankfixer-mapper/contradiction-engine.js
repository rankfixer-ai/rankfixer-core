// contradiction-engine.js
// Site Mapper v2 — Contradiction Engine (Phase 9)

export function detectContradictions(graph, entryIdentity, robotsDisallowed = []) {
    console.log('[Contradictions] Detecting...');
    const contradictions = [];

    for (const [identity, node] of graph) {
        // Sitemap contradictions
        if (node.inSitemap && node.statusCode >= 400) {
            contradictions.push({
                type:'indexability', subtype:'sitemap-dead-page', severity:'critical',
                message:`Sitemap includes ${identity} but returns ${node.statusCode}`,
                affectedUrls:[identity], recommendation:'Remove dead page from sitemap.'
            });
        }
        if (node.inSitemap && node.metaRobots?.includes('noindex')) {
            contradictions.push({
                type:'indexability', subtype:'sitemap-noindex', severity:'critical',
                message:`${identity} in sitemap but noindexed`,
                affectedUrls:[identity], recommendation:'Remove noindex or remove from sitemap.'
            });
        }

        // Noindex linked from elsewhere
        if (node.metaRobots?.includes('noindex') && node.inlinks.length > 0) {
            contradictions.push({
                type:'indexability', subtype:'noindex-linked', severity:'warning',
                message:`${identity} noindexed but has ${node.inlinks.length} inlinks`,
                affectedUrls:[identity], recommendation:'Remove noindex or remove links.'
            });
        }

        // Canonical contradictions — skip self-referencing canonicals
        if (node.canonical && node.canonical !== identity) {
            // Reciprocal canonical
            if (graph.has(node.canonical)) {
                const target = graph.get(node.canonical);
                if (target.canonical && target.canonical === identity) {
                    contradictions.push({
                        type:'structure', subtype:'reciprocal-canonical', severity:'critical',
                        message:`Reciprocal canonical: ${identity} ↔ ${node.canonical}`,
                        affectedUrls:[identity, node.canonical],
                        recommendation:'Break reciprocal canonical. One page should canonicalize to the other, not both ways.'
                    });
                }
                // Canonical chain
                if (target.canonical && target.canonical !== identity && target.canonical !== node.canonical) {
                    contradictions.push({
                        type:'structure', subtype:'canonical-chain', severity:'warning',
                        message:`Chain: ${identity} → ${node.canonical} → ${target.canonical}`,
                        affectedUrls:[identity, node.canonical, target.canonical],
                        recommendation:'Point directly to final canonical URL.'
                    });
                }
                // Canonical points to dead page
                if (target.statusCode >= 400) {
                    contradictions.push({
                        type:'structure', subtype:'canonical-dead', severity:'critical',
                        message:`${identity} canonical → ${node.canonical} (returns ${target.statusCode})`,
                        affectedUrls:[identity, node.canonical],
                        recommendation:'Fix canonical target — it returns an error.'
                    });
                }
            }
        }

        // High priority orphan
        if (node.isOrphan && node.inSitemap && (node.sitemapPriority || 0) >= 0.8) {
            contradictions.push({
                type:'structure', subtype:'high-priority-orphan', severity:'critical',
                message:`${identity} has sitemap priority ${node.sitemapPriority} but no internal links`,
                affectedUrls:[identity],
                recommendation:'Add internal links to this high-priority page.'
            });
        }

        // Content contradictions
        if (node.h1 && /text-indent\s*:\s*-9999/i.test(node.html || '')) {
            contradictions.push({
                type:'content', subtype:'hidden-h1', severity:'critical',
                message:`${identity} has hidden H1 (text-indent: -9999px)`,
                affectedUrls:[identity], recommendation:'Use a visible H1 tag.'
            });
        }
        if (node.h1 && node.title && node.h1.toLowerCase().trim() === node.title.toLowerCase().trim()) {
            contradictions.push({
                type:'content', subtype:'h1-equals-title', severity:'warning',
                message:`${identity} H1 is identical to title tag`,
                affectedUrls:[identity], recommendation:'Differentiate H1 from title.'
            });
        }
        const h1Count = (node.html || '').match(/<h1[^>]*>/gi);
        if (h1Count && h1Count.length > 1) {
            contradictions.push({
                type:'content', subtype:'multiple-h1', severity:'warning',
                message:`${identity} has ${h1Count.length} H1 tags (should have exactly one)`,
                affectedUrls:[identity], recommendation:'Use exactly one H1 tag per page.'
            });
        }
        if (node.contentSize > 500 && node.isOrphan) {
            contradictions.push({
                type:'content', subtype:'deep-content-orphan', severity:'critical',
                message:`${identity} has ${node.contentSize} words but is orphaned (no internal links point here)`,
                affectedUrls:[identity],
                recommendation:'Add internal links to this valuable content.'
            });
        }

        // Link graph contradictions
        if (node.inlinks.length >= 10 && node.metaRobots?.includes('noindex')) {
            contradictions.push({
                type:'link-graph', subtype:'link-equity-wasted', severity:'critical',
                message:`${identity} has ${node.inlinks.length} internal links but is noindexed`,
                affectedUrls:[identity], recommendation:'Remove noindex or update links.'
            });
        }
    }

    // Sitemap-only pages (not crawled)
    const sitemapOnly = [...graph.values()].filter(n => n.inSitemap && !n.html);
    if (sitemapOnly.length > 0) {
        contradictions.push({
            type:'sitemap', subtype:'sitemap-unreachable', severity:'warning',
            message:`${sitemapOnly.length} pages in sitemap were not discovered during crawl`,
            affectedUrls: sitemapOnly.slice(0, 10).map(n => n.identity),
            recommendation:'Check if these pages are reachable via internal links.'
        });
    }

    // Crawled pages not in sitemap
    const notInSitemap = [...graph.values()].filter(n => n.html && !n.inSitemap);
    if (notInSitemap.length > 0) {
        contradictions.push({
            type:'sitemap', subtype:'unlisted-content', severity:'info',
            message:`${notInSitemap.length} crawled pages are not in the sitemap`,
            affectedUrls: notInSitemap.slice(0, 10).map(n => n.identity),
            recommendation:'Consider adding important pages to the sitemap.'
        });
    }

    const criticalCount = contradictions.filter(c => c.severity === 'critical').length;
    console.log(`[Contradictions] ${contradictions.length} found (${criticalCount} critical)`);
    return contradictions;
}
