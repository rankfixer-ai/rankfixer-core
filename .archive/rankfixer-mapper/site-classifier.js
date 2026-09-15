// site-classifier.js
// Site Mapper v2 — Site Classification (Phases 1-2)
// Determines site archetype, rendering needs, and platform.

export function classify(html, url) {
    const lowerHtml = html.toLowerCase();
    const lowerUrl = url.toLowerCase();

    // 1. Rendering Strategy — deterministic: empty mount points or generator tags only
    let requiresJSRendering = false;

    const emptyMountPoints = [
        /<div[^>]*\bid\s*=\s*["']root["'][^>]*>\s*<\/div>/i,
        /<div[^>]*\bid\s*=\s*["']app["'][^>]*>\s*<\/div>/i,
        /<div[^>]*\bid\s*=\s*["']__next["'][^>]*>\s*<\/div>/i,
        /<div[^>]*\bid\s*=\s*["']__nuxt["'][^>]*>\s*<\/div>/i,
    ];

    for (const pattern of emptyMountPoints) {
        if (pattern.test(html)) { requiresJSRendering = true; break; }
    }

    if (!requiresJSRendering) {
        const generatorSignatures = [
            /<meta[^>]+name\s*=\s*["']generator["'][^>]+content\s*=\s*["'][^"']*(next\.js|nuxt\.js|gatsby)["'][^>]*>/i,
        ];
        for (const sig of generatorSignatures) {
            if (sig.test(html)) { requiresJSRendering = true; break; }
        }
    }

    // 2. Archetype — URL structure first (deterministic), HTML signals as precise fallback
    let archetype = 'unknown';

    if (lowerUrl.includes('/products/') || lowerUrl.includes('/product/') ||
        lowerUrl.includes('/collections/') || lowerUrl.includes('/cart') ||
        lowerUrl.includes('/checkout') || lowerUrl.includes('/shop/')) {
        archetype = 'ecommerce';
    }
    else if (lowerUrl.includes('docs.') || lowerUrl.includes('/docs/')) {
        archetype = 'content';
    }
    else if (lowerUrl.includes('/blog') || lowerUrl.includes('/article') ||
             lowerUrl.includes('/post/') || lowerUrl.includes('/news')) {
        archetype = 'content';
    }
    else if (lowerUrl.includes('/pricing') || lowerUrl.includes('/features') ||
             lowerUrl.includes('/signup') || lowerUrl.includes('/demo')) {
        archetype = 'saas';
    }
    else {
        if (lowerHtml.includes('cdn.shopify.com') || lowerHtml.includes('myshopify.com')) {
            archetype = 'ecommerce';
        } else if (/<meta[^>]+name\s*=\s*["']generator["'][^>]+content\s*=\s*["'][^"']*woocommerce[^"']*["'][^>]*>/i.test(html)) {
            archetype = 'ecommerce';
        } else if (/<link[^>]+type\s*=\s*["']application\/rss\+xml["'][^>]*>/i.test(html)) {
            archetype = 'content';
        } else if (/<meta[^>]+property\s*=\s*["']article:published_time["'][^>]*>/i.test(html)) {
            archetype = 'content';
        } else if (lowerHtml.includes('js.stripe.com') || lowerHtml.includes('checkout.stripe.com')) {
            archetype = 'saas';
        } else {
            archetype = 'brochure';
        }
    }

    return { requiresJSRendering, archetype };
}

export function getPageCap(archetype) {
    const caps = { 'brochure': 20, 'saas': 15, 'ecommerce': 15, 'content': 10, 'unknown': 5 };
    return caps[archetype] || 5;
}
