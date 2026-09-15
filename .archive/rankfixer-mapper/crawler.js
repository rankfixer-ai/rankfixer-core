// crawler.js
// Site Mapper v2 — BFS Crawler Module
// Self-contained: no external dependencies.

export function normalizeUrl(url, baseUrl) {
    try {
        const resolved = new URL(url, baseUrl);
        resolved.hash = '';
        resolved.hostname = resolved.hostname.toLowerCase();
        const stripParams = ['hl', 'gl', 'fbclid', 'gclid', 'utm_source', 'utm_medium',
            'utm_campaign', 'utm_content', 'utm_term', 'ref', 'source', 'session', 'sid'];
        for (const param of stripParams) resolved.searchParams.delete(param);
        let normalized = resolved.toString();
        if (normalized.endsWith('/') && resolved.pathname !== '/') normalized = normalized.slice(0, -1);
        return normalized;
    } catch { return null; }
}

export function isSameOrigin(url, baseUrl) {
    try {
        const resolved = new URL(url, baseUrl);
        const base = new URL(baseUrl);
        return resolved.hostname === base.hostname;
    } catch { return false; }
}

export function extractLinks(html, baseUrl) {
    const links = [];
    const hrefRegex = /<a[^>]+href\s*=\s*["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
        const href = match[1];
        if (href.startsWith('#') || href.startsWith('javascript:') ||
            href.startsWith('mailto:') || href.startsWith('tel:')) continue;
        const normalized = normalizeUrl(href, baseUrl);
        if (normalized && isSameOrigin(normalized, baseUrl)) links.push(normalized);
    }
    return links;
}

async function fetchRobotsTxt(baseUrl) {
    try {
        const parsed = new URL(baseUrl);
        const robotsUrl = `${parsed.protocol}//${parsed.hostname}/robots.txt`;
        const response = await fetch(robotsUrl, { headers: { 'User-Agent': 'SiteMapper/2.0' } });
        if (!response.ok) return null;
        const text = await response.text();
        const disallowed = [];
        let currentAgent = null;
        for (const line of text.split('\n')) {
            const trimmed = line.trim();
            if (trimmed.startsWith('User-agent:')) currentAgent = trimmed.split(':')[1].trim().toLowerCase();
            if (trimmed.startsWith('Disallow:') && (currentAgent === '*' || currentAgent === 'sitemapper')) {
                const path = trimmed.split(':').slice(1).join(':').trim();
                if (path) disallowed.push(path);
            }
        }
        return disallowed.length > 0 ? disallowed : null;
    } catch { return null; }
}

function isDisallowed(url, disallowedPatterns) {
    if (!disallowedPatterns) return false;
    try { return disallowedPatterns.some(p => new URL(url).pathname.startsWith(p)); }
    catch { return false; }
}

async function fetchPage(url) {
    const response = await fetch(url, {
        redirect: 'follow',
        headers: { 'User-Agent': 'SiteMapper/2.0', 'Accept-Language': 'en-US,en;q=0.9' }
    });
    const html = await response.text();
    return { html, statusCode: response.status, finalUrl: response.url };
}

async function fetchPuppeteer(browser, url) {
    const page = await browser.newPage();
    try {
        await page.setUserAgent('SiteMapper/2.0');
        const resp = await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
        const html = await page.content();
        return { html, statusCode: resp ? resp.status() : 200, finalUrl: page.url() };
    } finally { await page.close(); }
}

export async function crawl(entryUrl, options = {}) {
    console.log(`[Crawler] Fetching: ${entryUrl}`);
    const entryFetch = await fetchPage(entryUrl);
    const entryHtml = entryFetch.html;
    const baseUrl = normalizeUrl(entryFetch.finalUrl, entryFetch.finalUrl) || entryUrl;

    const { classify, getPageCap } = await import('./site-classifier.js');
    const classification = classify(entryHtml, baseUrl);
    const pageCap = options.pageCap || getPageCap(classification.archetype);

    console.log(`[Crawler] archetype=${classification.archetype}, pageCap=${pageCap}`);

    const robotsDisallowed = await fetchRobotsTxt(baseUrl);
    if (robotsDisallowed) console.log(`[Crawler] robots.txt: ${robotsDisallowed.length} patterns`);

    const usePuppeteer = classification.requiresJSRendering;
    let browser = null;
    if (usePuppeteer) {
        try {
            const puppeteer = await import('puppeteer');
            browser = await puppeteer.default.launch({ headless: 'new' });
            console.log('[Crawler] Puppeteer launched');
        } catch (err) { console.warn(`[Crawler] Puppeteer unavailable: ${err.message}`); }
    }

    const visited = new Set();
    const queue = [{ url: baseUrl, depth: 0 }];
    const pages = [];

    try {
        while (queue.length > 0 && visited.size < pageCap) {
            const { url: currentUrl, depth } = queue.shift();
            const normalized = normalizeUrl(currentUrl, currentUrl);
            if (!normalized || visited.has(normalized)) continue;
            visited.add(normalized);

            const blocked = isDisallowed(normalized, robotsDisallowed);
            console.log(`[Crawler] ${blocked ? '[BLOCKED] ' : ''}[${visited.size}/${pageCap}] d=${depth} ${normalized}`);

            let result;
            try {
                if (usePuppeteer && browser) {
                    result = await fetchPuppeteer(browser, normalized);
                } else {
                    result = await fetchPage(normalized);
                }
            } catch (err) {
                console.warn(`[Crawler] Failed: ${normalized} — ${err.message}`);
                pages.push({ url: normalized, finalUrl: normalized, html: null, statusCode: 0, error: err.message, depth, robotsBlocked: blocked });
                continue;
            }

            pages.push({ url: normalized, finalUrl: result.finalUrl, html: result.html, statusCode: result.statusCode, error: null, depth, robotsBlocked: blocked });

            if (result.html && result.statusCode >= 200 && result.statusCode < 400) {
                for (const link of extractLinks(result.html, normalized)) {
                    const linkNorm = normalizeUrl(link, link);
                    if (linkNorm && !visited.has(linkNorm) && !queue.some(q => normalizeUrl(q.url, q.url) === linkNorm)) {
                        queue.push({ url: linkNorm, depth: depth + 1 });
                    }
                }
            }
        }
    } finally {
        if (browser) { await browser.close(); console.log('[Crawler] Puppeteer closed'); }
    }

    console.log(`[Crawler] Done: ${pages.length} pages`);
    return { classification, pages, robotsDisallowed };
}
