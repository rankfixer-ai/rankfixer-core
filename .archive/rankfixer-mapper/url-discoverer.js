// url-discoverer.js
// Site Mapper v2 — URL Discovery (Phase 3)
// Fetches sitemap and performs shallow crawl to build URL inventory.

import { normalizeUrl, extractLinks } from './crawler.js';

export async function discoverUrls(entryUrl, entryHtml, classification) {
    console.log('[Discovery] Building URL inventory...');
    const baseUrl = normalizeUrl(entryUrl, entryUrl) || entryUrl;
    const baseParsed = new URL(baseUrl);

    const sitemapEntries = await fetchSitemap(baseParsed);
    const sitemapUrls = sitemapEntries.map(e => normalizeUrl(e.url, e.url)).filter(Boolean);
    console.log(`[Discovery] Sitemap: ${sitemapUrls.length} URLs`);

    const crawlUrls = await shallowCrawl(baseUrl, entryHtml, baseParsed);
    console.log(`[Discovery] Crawl: ${crawlUrls.length} URLs`);

    const urlMap = new Map();
    for (const entry of sitemapEntries) {
        const normalized = normalizeUrl(entry.url, entry.url);
        if (!normalized) continue;
        urlMap.set(normalized, { url: normalized, source: 'sitemap', priority: entry.priority || null, lastmod: entry.lastmod || null, changefreq: entry.changefreq || null });
    }
    for (const url of crawlUrls) {
        const normalized = normalizeUrl(url, url);
        if (!normalized) continue;
        if (urlMap.has(normalized)) { urlMap.get(normalized).alsoCrawled = true; }
        else { urlMap.set(normalized, { url: normalized, source: 'crawl', priority: null, lastmod: null, changefreq: null, onlyInCrawl: true }); }
    }

    const allUrls = [...urlMap.values()];
    const sitemapOnly = allUrls.filter(u => u.source === 'sitemap' && !u.alsoCrawled);
    const crawlOnly = allUrls.filter(u => u.onlyInCrawl);

    console.log(`[Discovery] Total: ${allUrls.length} (sitemap: ${sitemapUrls.length}, crawl: ${crawlUrls.length})`);

    return { urls: allUrls, sitemapEntries, stats: { totalUrls: allUrls.length, sitemapUrls: sitemapUrls.length, crawlUrls: crawlUrls.length, sitemapOnly: sitemapOnly.length, crawlOnly: crawlOnly.length, overlap: allUrls.length - sitemapOnly.length - crawlOnly.length } };
}

async function fetchSitemap(baseParsed) {
    const urls = [
        `${baseParsed.protocol}//${baseParsed.hostname}/sitemap.xml`,
        `${baseParsed.protocol}//${baseParsed.hostname}/sitemap_index.xml`,
        `${baseParsed.protocol}//${baseParsed.hostname}/wp-sitemap.xml`,
    ];
    for (const sitemapUrl of urls) {
        const entries = await fetchAndParseSitemap(sitemapUrl, baseParsed);
        if (entries.length > 0) return entries;
    }
    return [];
}

async function fetchAndParseSitemap(sitemapUrl, baseParsed, depth = 0) {
    if (depth > 3) return []; // guard against circular sitemap references
    try {
        const response = await fetch(sitemapUrl, { headers: { 'User-Agent': 'SiteMapper/2.0' }, redirect: 'follow' });
        if (!response.ok) return [];
        const xml = await response.text();

        // Check if sitemap index (contains <sitemap> blocks, not <url> blocks)
        const sitemapMatches = xml.match(/<sitemap>[\s\S]*?<\/sitemap>/gi);
        if (sitemapMatches) {
            console.log(`[Discovery]   Sitemap index: ${sitemapMatches.length} child sitemaps`);
            const childSitemapUrls = sitemapMatches
                .map(sm => { const m = sm.match(/<loc>([^<]+)<\/loc>/i); return m ? m[1].trim() : null; })
                .filter(Boolean);
            const childEntries = await Promise.all(
                childSitemapUrls.map(url => fetchAndParseSitemap(url, baseParsed, depth + 1))
            );
            return childEntries.flat();
        }

        // Regular sitemap with <url> blocks
        return parseSitemapXml(xml, baseParsed);
    } catch { return []; }
}

function parseSitemapXml(xml, baseParsed) {
    const entries = [];
    const urlMatches = xml.match(/<url>[\s\S]*?<\/url>/gi);
    if (!urlMatches) return entries;
    for (const urlBlock of urlMatches) {
        const locMatch = urlBlock.match(/<loc>([^<]+)<\/loc>/i);
        if (!locMatch) continue;
        try { if (new URL(locMatch[1].trim()).hostname !== baseParsed.hostname) continue; } catch { continue; }
        const priorityMatch = urlBlock.match(/<priority>([^<]+)<\/priority>/i);
        const lastmodMatch = urlBlock.match(/<lastmod>([^<]+)<\/lastmod>/i);
        const changefreqMatch = urlBlock.match(/<changefreq>([^<]+)<\/changefreq>/i);
        entries.push({ url: locMatch[1].trim(), priority: priorityMatch ? parseFloat(priorityMatch[1]) : null, lastmod: lastmodMatch ? lastmodMatch[1].trim() : null, changefreq: changefreqMatch ? changefreqMatch[1].trim() : null });
    }
    return entries;
}

async function shallowCrawl(baseUrl, entryHtml, baseParsed) {
    const visited = new Set();
    const urls = [];
    const MAX_PAGES = 20, MAX_DEPTH = 2;
    visited.add(normalizeUrl(baseUrl, baseUrl));
    urls.push(baseUrl);

    const queue = [];
    for (const link of extractLinks(entryHtml, baseUrl)) {
        const n = normalizeUrl(link, link);
        if (n && !visited.has(n)) queue.push({ url: n, depth: 1 });
    }

    while (queue.length > 0 && visited.size < MAX_PAGES) {
        const { url, depth } = queue.shift();
        const normalized = normalizeUrl(url, url);
        if (!normalized || visited.has(normalized) || depth > MAX_DEPTH) continue;
        visited.add(normalized);
        urls.push(normalized);
        if (depth < MAX_DEPTH && visited.size < MAX_PAGES) {
            try {
                const response = await fetch(normalized, { headers: { 'User-Agent': 'SiteMapper/2.0' }, redirect: 'follow' });
                if (response.ok) {
                    for (const link of extractLinks(await response.text(), normalized)) {
                        const ln = normalizeUrl(link, link);
                        if (ln && !visited.has(ln) && !queue.some(q => normalizeUrl(q.url, q.url) === ln)) queue.push({ url: ln, depth: depth + 1 });
                    }
                }
            } catch { /* skip */ }
        }
    }
    return urls;
}
