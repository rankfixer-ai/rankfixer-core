// graph-builder.js
// Site Mapper v2 — Link Graph Builder (Phases 7-8)
// Self-contained: all helpers inlined.

export function buildGraph(pages, entryUrl) {
    const graph = new Map();
    console.log(`[Graph] Building from ${pages.length} pages...`);

    for (const page of pages) {
        const identity = normalizeIdentity(page.finalUrl || page.url);
        if (!identity || graph.has(identity)) continue;
        graph.set(identity, createNode(page, identity));
    }

    let totalLinks = 0;
    for (const [identity, node] of graph) {
        if (!node.html) continue;
        const outlinks = extractOutlinksFromNode(node.html, identity);
        totalLinks += outlinks.size;
        for (const [targetId, anchorText] of outlinks) {
            if (graph.has(targetId)) {
                graph.get(targetId).inlinks.push(identity);
                graph.get(targetId).inlinkDetails.push({ source: identity, anchorText });
            }
        }
    }

    const entryIdentity = [...graph.keys()][0];
    if (entryIdentity) calculateClickDepth(graph, entryIdentity);

    for (const [identity, node] of graph) {
        node.internalInlinkCount = node.inlinks.length;
        node.isOrphan = node.internalInlinkCount === 0 && identity !== entryIdentity;
        node.isIndexable = determineIndexability(node);
        node.pageValue = calculatePageValue(node, entryIdentity);
    }

    const templates = detectTemplates(graph);
    const orphanCount = [...graph.values()].filter(n => n.isOrphan).length;
    console.log(`[Graph] ${graph.size} nodes, ${totalLinks} edges, ${orphanCount} orphans`);
    return { graph, templates, entryIdentity: entryIdentity || '', stats: { totalNodes: graph.size, totalEdges: totalLinks, orphanNodes: orphanCount } };
}

export function finalizeGraph(graph) { return graph; }

function normalizeIdentity(url) {
    try {
        const p = new URL(url); p.hash = '';
        ['hl','gl','fbclid','gclid','utm_source','utm_medium','utm_campaign','utm_content','utm_term','ref','source','session','sid'].forEach(k => p.searchParams.delete(k));
        let n = p.toString();
        if (n.endsWith('/') && p.pathname !== '/') n = n.slice(0, -1);
        return n;
    } catch { return url; }
}

function createNode(page, identity) {
    const html = page.html || '';
    return {
        identity, html,
        title: (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1]?.trim() || null,
        h1: (html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || [])[1]?.trim() || null,
        metaDescription: (html.match(/<meta[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']+)["'][^>]*>/i) || [])[1]?.trim() || null,
        metaRobots: (html.match(/<meta[^>]*name\s*=\s*["']robots["'][^>]*content\s*=\s*["']([^"']+)["'][^>]*>/i) || [])[1]?.toLowerCase()?.trim() || null,
        canonical: extractCanonicalFromHtml(html, identity),
        statusCode: page.statusCode || 0, redirectChain: [], xRobotsTag: null,
        inlinks: [], inlinkDetails: [], clickDepth: Infinity,
        internalInlinkCount: 0, contentSize: (html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().split(' ').filter(w=>w.length>0).length),
        imageCount: (html.match(/<img[^>]+>/gi) || []).length,
        isOrphan: false, isIndexable: true,
        pageValue: 0, templatePattern: null
    };
}

function extractCanonicalFromHtml(html, baseUrl) {
    const m = html.match(/<link[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']+)["'][^>]*>/i);
    if (!m) return null;
    try { return normalizeIdentity(new URL(m[1], baseUrl).toString()); } catch { return null; }
}

function extractOutlinksFromNode(html, baseIdentity) {
    const outlinks = new Map();
    const regex = /<a[^>]+href\s*=\s*["']([^"']+)["'][^>]*>/gi;
    let m;
    while ((m = regex.exec(html)) !== null) {
        const href = m[1];
        if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
        try {
            const resolved = new URL(href, baseIdentity);
            if (resolved.hostname !== new URL(baseIdentity).hostname) continue;
            const tid = normalizeIdentity(resolved.toString());
            const am = html.slice(m.index).match(/<a[^>]*>([^<]*)<\/a>/i);
            if (!outlinks.has(tid)) outlinks.set(tid, am ? am[1].trim() : '');
        } catch { continue; }
    }
    return outlinks;
}

function calculateClickDepth(graph, entryIdentity) {
    for (const n of graph.values()) n.clickDepth = Infinity;
    const entry = graph.get(entryIdentity);
    if (!entry) return;
    entry.clickDepth = 0;
    const q = [entryIdentity], vis = new Set();
    while (q.length > 0) {
        const cur = q.shift();
        if (vis.has(cur)) continue;
        vis.add(cur);
        const node = graph.get(cur);
        if (!node) continue;
        for (const [tid] of extractOutlinksFromNode(node.html, cur)) {
            const t = graph.get(tid);
            if (t && t.clickDepth > node.clickDepth + 1) { t.clickDepth = node.clickDepth + 1; q.push(tid); }
        }
    }
}

function determineIndexability(node) {
    if (node.statusCode >= 400 || (node.statusCode === 0 && !node.html)) return false;
    if (node.metaRobots?.includes('noindex')) return false;
    return true;
}

function calculatePageValue(node, entryIdentity) {
    let v = node.inlinks.length * 10;
    if (node.clickDepth === 0) v += 50; else if (node.clickDepth === 1) v += 30; else if (node.clickDepth === 2) v += 15;
    if (node.contentSize > 500) v += 20; else if (node.contentSize > 200) v += 10;
    if (node.title) v += 10;
    if (node.metaDescription) v += 5;
    if (node.isOrphan) v -= 100;
    if (!node.isIndexable) v -= 50;
    if (node.statusCode >= 400) v -= 200;
    return v;
}

function detectTemplates(graph) {
    const patterns = new Map();
    for (const [id] of graph) {
        const p = generateUrlPatternStatic(id);
        if (!patterns.has(p)) patterns.set(p, { pattern: p, instances: [], sampledUrls: [] });
        patterns.get(p).instances.push(id);
    }
    return [...patterns.values()].filter(d => d.instances.length >= 2).map(d => ({ ...d, sampledUrls: d.instances.slice(0, 3), instanceCount: d.instances.length }));
}

function generateUrlPatternStatic(url) {
    try {
        const segs = new URL(url).pathname.split('/').filter(s => s);
        return '/' + segs.map(s => /^\d+$/.test(s) ? '{id}' : /^[a-f0-9-]{32,}$/i.test(s) ? '{uuid}' : s).join('/');
    } catch { return url; }
}
