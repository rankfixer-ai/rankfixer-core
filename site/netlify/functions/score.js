// Netlify Function: real RankFixer scoring engine
// Path: site/netlify/functions/score.js
// Zero dependencies — uses global fetch (Node 18+). No package.json needed.
export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  let domain = '';
  try {
    const body = JSON.parse(event.body || '{}');
    domain = (body.domain || '').trim();
  } catch (_) {}
  if (!domain) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'missing domain' }) };
  }
  domain = domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/^www\./i, '');

  const base = 'https://' + domain;
  const results = { domain, dimensions: {}, score: 0, label: '', signals: [] };

  try {
    const [htmlRes, robotsRes, llmsRes] = await Promise.allSettled([
      fetch(base + '/', { headers: { 'User-Agent': 'RankFixerBot/1.0 (+https://rankfixer.co)' }, redirect: 'follow' }),
      fetch(base + '/robots.txt', { headers: { 'User-Agent': 'RankFixerBot/1.0' } }),
      fetch(base + '/llms.txt', { headers: { 'User-Agent': 'RankFixerBot/1.0' } }),
    ]);

    let html = '';
    if (htmlRes.status === 'fulfilled' && htmlRes.value.ok) {
      html = await htmlRes.value.text();
    }
    results.dimensions.crawlable = scoreCrawlable(htmlRes, robotsRes);

    if (html) {
      results.dimensions.schema = scoreSchema(html);
      results.dimensions.entity = scoreEntity(html);
      results.dimensions.content = scoreContent(html);
      results.dimensions.structure = scoreStructure(html);
    } else {
      results.dimensions.schema = 0;
      results.dimensions.entity = 0;
      results.dimensions.content = 0;
      results.dimensions.structure = 0;
      results.signals.push('Site unreachable or blocked — could not analyze content.');
    }

    if (llmsRes.status === 'fulfilled' && llmsRes.value.ok) {
      results.dimensions.llmsTxt = 100;
      results.signals.push('llms.txt present — AI crawlers get a curated map.');
    } else {
      results.dimensions.llmsTxt = 0;
    }

    // Weighted overall
    const weights = { schema: 0.25, entity: 0.20, content: 0.20, structure: 0.15, crawlable: 0.10, llmsTxt: 0.10 };
    let total = 0, wsum = 0;
    for (const k in weights) {
      const v = results.dimensions[k] || 0;
      total += v * weights[k];
      wsum += weights[k];
    }
    const score = Math.round(total / wsum);
    results.score = score;
    results.label = score >= 80 ? 'Strong' : score >= 60 ? 'Fair' : score >= 40 ? 'Weak' : 'Poor';

    return { statusCode: 200, headers, body: JSON.stringify(results) };
  } catch (e) {
    return { statusCode: 200, headers, body: JSON.stringify({ domain, error: 'analysis_failed', detail: String(e).slice(0, 200), score: 0, label: 'Unknown', dimensions: {} }) };
  }
}

export function scoreCrawlable(htmlRes, robotsRes) {
  let s = 50;
  if (htmlRes.status === 'fulfilled' && htmlRes.value.ok) s += 30;
  else if (htmlRes.status === 'fulfilled' && htmlRes.value.status === 403) s -= 30;
  if (robotsRes.status === 'fulfilled' && robotsRes.value.ok) {
    // check for AI crawler disallow
    return s; // presence is neutral; content matters more
  }
  return s;
}

export function scoreSchema(html) {
  const ldMatches = html.match(/application\/ld\+json/gi) || [];
  let s = 10 * Math.min(ldMatches.length, 3);
  const types = (html.match(/"@type"\s*:\s*"([^"]+)"/g) || []).map(m => m.match(/"@type"\s*:\s*"([^"]+)"/)[1]);
  const has = t => types.some(x => x.toLowerCase().includes(t.toLowerCase()));
  if (has('Organization')) s += 20;
  if (has('FAQPage')) s += 15;
  if (has('WebSite') || has('WebPage')) s += 10;
  if (has('Product') || has('Article') || has('HowTo')) s += 10;
  return Math.min(100, s);
}

export function scoreEntity(html) {
  let s = 20;
  // @id linking
  const ids = html.match(/"@id"\s*:\s*"([^"]+)"/g) || [];
  if (ids.length > 0) s += 25;
  // sameAs
  if (/sameAs/i.test(html)) s += 20;
  // brand mentions structured
  if (/"brand"/i.test(html)) s += 15;
  // meta description / og
  if (/property="og:(title|description|url)"/i.test(html)) s += 10;
  if (/name="twitter:card"/i.test(html)) s += 10;
  return Math.min(100, s);
}

export function scoreContent(html) {
  let s = 0;
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words > 300) s += 30; else if (words > 150) s += 20; else s += 10;
  // FAQ-like structure
  const qCount = (html.match(/<(h2|h3|h4)[^>]*>\s*[^<]*\?/gi) || []).length;
  if (qCount > 0) s += 25;
  // answer blocks
  if (words > 500) s += 20;
  // structured lists / tables
  if (/<(table|ul|ol)/i.test(html)) s += 15;
  // meta description
  if (/name="description"/i.test(html)) s += 10;
  return Math.min(100, s);
}

export function scoreStructure(html) {
  let s = 20;
  if (/<h1/i.test(html)) s += 20;
  const h2 = (html.match(/<h2/gi) || []).length;
  if (h2 >= 1) s += 20;
  if (h2 >= 3) s += 10;
  if (/itemprop|itemscope|typeof=/i.test(html)) s += 15;
  if (/<nav/i.test(html)) s += 5;
  if (/<main/i.test(html) || /role="main"/i.test(html)) s += 10;
  return Math.min(100, s);
}
