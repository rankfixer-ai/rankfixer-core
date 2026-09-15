// template-discoverer.js
// Site Mapper v2 — Template Discovery (Phases 4-5)

export function discoverTemplates(urlEntries, entryUrl) {
    console.log('[Templates] Grouping URLs by pattern...');
    const patternMap = new Map();

    for (const entry of urlEntries) {
        const pattern = generateUrlPattern(entry.url);
        if (!patternMap.has(pattern)) patternMap.set(pattern, { pattern, urls: [], entries: [] });
        patternMap.get(pattern).urls.push(entry.url);
        patternMap.get(pattern).entries.push(entry);
    }

    // Separate true templates (3+ instances) from individual pages
    const trueTemplates = [];
    const individualPages = [];

    for (const [pattern, group] of patternMap) {
        if (group.urls.length >= 3 || pattern === '/' || pattern === '/cart' || pattern === '/checkout') {
            trueTemplates.push({ pattern, group });
        } else {
            individualPages.push({ pattern, group });
        }
    }

    trueTemplates.sort((a, b) => b.group.urls.length - a.group.urls.length);

    const templates = [];
    for (const { pattern, group } of trueTemplates) {
        const pageType = classifyTemplate(pattern, group.urls, entryUrl);
        const sampleCount = Math.min(3, group.urls.length);
        const samples = selectSamples(group.urls, sampleCount);
        templates.push({
            pattern, pageType, instanceCount: group.urls.length, sampleCount, samples,
            allUrls: group.urls,
            sitemapEntries: group.entries.filter(e => e.source === 'sitemap'),
            hasSitemapData: group.entries.some(e => e.priority !== null)
        });
    }

    // Catch-all for individual pages (sample up to 5)
    if (individualPages.length > 0) {
        const allIndividualUrls = individualPages.flatMap(p => p.group.urls);
        const sampleCount = Math.min(5, allIndividualUrls.length);
        const samples = selectSamples(allIndividualUrls, sampleCount);
        templates.push({
            pattern: '(individual pages)',
            pageType: 'static-page',
            instanceCount: allIndividualUrls.length,
            sampleCount,
            samples,
            allUrls: allIndividualUrls,
            sitemapEntries: [],
            hasSitemapData: false
        });
    }

    const sampleUrls = [];
    const sampleLookup = new Map();
    for (const t of templates) {
        for (const s of t.samples) {
            if (!sampleLookup.has(s)) {
                sampleUrls.push(s);
                sampleLookup.set(s, { templatePattern: t.pattern, pageType: t.pageType, instanceCount: t.instanceCount });
            }
        }
    }

    const realCount = trueTemplates.length;
    const hasCatchAll = individualPages.length > 0;
    console.log(`[Templates] ${templates.length} templates (${realCount} real${hasCatchAll ? ' + 1 catch-all' : ''}), ${sampleUrls.length} samples`);
    for (const t of templates) {
        console.log(`[Templates]   ${t.pattern} → ${t.pageType} (${t.instanceCount} pages, ${t.sampleCount} samples)`);
    }

    return { templates, samples: sampleUrls, sampleLookup, stats: { totalPatterns: patternMap.size, totalTemplates: templates.length, totalSamples: sampleUrls.length, totalInstances: urlEntries.length } };
}

export function refineTemplateClassification(template, samplePages) {
    if (samplePages.length === 0) return template;

    let hasProductSchema = false;
    let hasArticleSchema = false;
    let hasAddToCart = false;
    let hasProductGrid = false;
    let hasPublishDate = false;

    for (const page of samplePages) {
        if (!page.html) continue;
        const html = page.html.toLowerCase();

        // Product schema — strong signal
        if (html.includes('"@type":"product"') || html.includes('"@type": "product"')) {
            hasProductSchema = true;
        }
        // Article schema — strong signal
        if (html.includes('"@type":"article"') || html.includes('"@type": "article"') || 
            html.includes('"@type":"blogposting"')) {
            hasArticleSchema = true;
        }
        // Add to cart — only check if we're already in an e-commerce URL pattern
        if (template.pattern.includes('/product') || template.pattern.includes('/collection') ||
            template.pattern.includes('/cart') || template.pattern.includes('/checkout')) {
            if (html.includes('add-to-cart') || html.includes('addtocart') || html.includes('add to cart')) {
                hasAddToCart = true;
            }
        }
        // Product grid (multiple product cards on a category page)
        const productMatches = html.match(/"@type":"product"/gi);
        if (productMatches && productMatches.length >= 3) {
            hasProductGrid = true;
        }
        // Article publish date
        if (html.includes('article:published_time') || html.includes('"datepublished"')) {
            hasPublishDate = true;
        }
    }

    let refinedType = template.pageType;

    // Only refine if we have strong schema evidence, not just price strings
    if (hasProductSchema) {
        refinedType = 'product';
    } else if (hasAddToCart && (template.pageType === 'product' || template.pageType === 'category')) {
        refinedType = template.pageType; // Keep original if it matches
    } else if (hasProductGrid) {
        refinedType = 'category';
    } else if (hasArticleSchema || hasPublishDate) {
        refinedType = 'article';
    }

    return {
        ...template,
        pageType: refinedType,
        classificationConfidence: refinedType === template.pageType ? 'high' : 
                                  hasProductSchema || hasArticleSchema ? 'refined' : 'url-only',
        htmlSignals: { hasProductSchema, hasArticleSchema, hasAddToCart, hasProductGrid, hasPublishDate }
    };
}

function generateUrlPattern(url) {
    try {
        const parsed = new URL(url);
        const segments = parsed.pathname.split('/').filter(s => s.length > 0);
        if (segments.length === 0) return '/';

        const patternSegments = segments.map(seg => {
            if (/^\d+$/.test(seg)) return '{id}';
            if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(seg)) return '{uuid}';
            if (/^[a-f0-9]{32,}$/i.test(seg)) return '{uuid}';
            if (/^\d{4}$/.test(seg) && segments.length > 1) return '{year}';
            if (/^\d{2}$/.test(seg)) return '{num}';
            if (seg.includes('-') && seg.length > 10) return '{slug}';
            if (seg.length > 2 && !/^\d+$/.test(seg)) return '{slug}';
            return seg;
        });

        return '/' + patternSegments.join('/');
    } catch { return url; }
}

function classifyTemplate(pattern, urls, entryUrl) {
    const lower = pattern.toLowerCase();
    if (pattern === '/') return 'homepage';
    if (lower.includes('/product') || lower.includes('/item') || lower.includes('/p/')) return 'product';
    if (lower.includes('/collection') || lower.includes('/category') || lower.includes('/shop') || lower.includes('/c/')) return 'category';
    if (lower.includes('/cart') || lower.includes('/basket')) return 'cart';
    if (lower.includes('/checkout') || lower.includes('/payment') || lower.includes('/order')) return 'checkout';
    if (lower.includes('/blog') || lower.includes('/article') || lower.includes('/post') || lower.includes('/news') || (lower.includes('{year}') && lower.includes('{num}'))) return 'article';
    if (lower.includes('/docs') || lower.includes('/documentation') || lower.includes('/guide') || lower.includes('/tutorial')) return 'documentation';
    if (lower.includes('/search')) return 'search';
    if (lower.includes('/account') || lower.includes('/login') || lower.includes('/signin') || lower.includes('/signup') || lower.includes('/register')) return 'account';
    if (lower.includes('/tag') || lower.includes('/label') || lower.includes('/topic')) return 'tag';
    if (lower.includes('/author') || lower.includes('/user')) return 'author';
    if (lower.includes('{slug}')) return 'page';
    if (lower.includes('{id}')) return 'item';
    return 'static-page';
}

function selectSamples(urls, count) {
    if (urls.length <= count) return [...urls];
    const samples = [];
    const step = Math.floor(urls.length / count);
    for (let i = 0; i < count; i++) samples.push(urls[Math.min(i * step, urls.length - 1)]);
    if (!samples.includes(urls[0])) samples[0] = urls[0];
    if (!samples.includes(urls[urls.length - 1])) samples[samples.length - 1] = urls[urls.length - 1];
    return [...new Set(samples)];
}
