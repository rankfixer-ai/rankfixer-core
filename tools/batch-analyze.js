// tools/batch-analyze.js
// Batch-run the deployed RankFixer scoring engine against data/domains_to_analyze.txt
// Usage: node tools/batch-analyze.js [limit]   (limit = N domains for smoke test; omit for full run)
// Domains that block the crawler (HTTP 401/403/406/418/429) or are unreachable are marked
// "blocked"/"error" and excluded from average/median/distribution.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scoreCrawlable, scoreSchema, scoreEntity, scoreContent, scoreStructure, detectStatus } from '../site/netlify/functions/score.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DOMAINS_PATH = join(ROOT, 'data', 'domains_to_analyze.txt');
const OUT_PATH = join(ROOT, 'data', 'top_100_saas_scores.json');

const UA = { 'User-Agent': 'RankFixerBot/1.0 (+https://rankfixer.co)' };
const CONCURRENCY = 6;
const TIMEOUT_MS = 20000;
const WEIGHTS = { schema: 0.25, entity: 0.20, content: 0.20, structure: 0.15, crawlable: 0.10, llmsTxt: 0.10 };

function tierOf(score) {
  if (score >= 81) return 'Excellent';
  if (score >= 61) return 'Good';
  if (score >= 41) return 'Fair';
  if (score >= 21) return 'Poor';
  return 'Critical';
}

async function fetchT(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { headers: UA, redirect: 'follow', signal: ctrl.signal });
  } finally { clearTimeout(t); }
}

async function analyze(domain) {
  const base = 'https://' + domain;
  const [htmlRes, robotsRes, llmsRes] = await Promise.allSettled([
    fetchT(base + '/'),
    fetchT(base + '/robots.txt'),
    fetchT(base + '/llms.txt'),
  ]);
  const status = detectStatus(htmlRes);
  if (status !== 'ok') {
    const http = htmlRes.status === 'fulfilled' ? String(htmlRes.value.status) : 'network error / timeout';
    return { domain, status, http, score: null, tier: null };
  }
  let html = '';
  try { html = await htmlRes.value.text(); } catch (_) {}
  const dims = {};
  dims.crawlable = scoreCrawlable(htmlRes, robotsRes);
  if (html) {
    dims.schema = scoreSchema(html);
    dims.entity = scoreEntity(html);
    dims.content = scoreContent(html);
    dims.structure = scoreStructure(html);
  } else {
    dims.schema = 0; dims.entity = 0; dims.content = 0; dims.structure = 0;
  }
  dims.llmsTxt = (llmsRes.status === 'fulfilled' && llmsRes.value.ok) ? 100 : 0;

  let total = 0, wsum = 0;
  for (const k in WEIGHTS) { total += (dims[k] || 0) * WEIGHTS[k]; wsum += WEIGHTS[k]; }
  const score = Math.round(total / wsum);
  return {
    domain, status: 'ok', score, tier: tierOf(score),
    schema: dims.schema, entity: dims.entity, content: dims.content,
    structure: dims.structure, crawlable: dims.crawlable, llms_txt: dims.llmsTxt,
  };
}

function buildSummary(results) {
  const analyzed = results.filter(r => r.status === 'ok');
  const blocked = results.filter(r => r.status === 'blocked');
  const error = results.filter(r => r.status === 'error');
  const sorted = [...analyzed].sort((a, b) => b.score - a.score);
  const n = sorted.length;
  const sum = sorted.reduce((s, r) => s + r.score, 0);
  const avg = n ? Math.round((sum / n) * 10) / 10 : 0;
  const median = n % 2 === 1
    ? sorted[Math.floor(n / 2)].score
    : (n ? Math.round(((sorted[n / 2 - 1].score + sorted[n / 2].score) / 2) * 10) / 10 : 0);

  const dist = { tier_1_excellent_81_100: 0, tier_2_good_61_80: 0, tier_3_fair_41_60: 0, tier_4_poor_21_40: 0, tier_5_critical_0_20: 0 };
  for (const r of sorted) {
    if (r.score >= 81) dist.tier_1_excellent_81_100++;
    else if (r.score >= 61) dist.tier_2_good_61_80++;
    else if (r.score >= 41) dist.tier_3_fair_41_60++;
    else if (r.score >= 21) dist.tier_4_poor_21_40++;
    else dist.tier_5_critical_0_20++;
  }

  const top = sorted.slice(0, 10).map((r, i) => ({ rank: i + 1, domain: r.domain, score: r.score, tier: r.tier }));
  const bottom = sorted.slice(-10).map((r, i) => ({ rank: n - 9 + i, domain: r.domain, score: r.score, tier: r.tier }));

  const SIG = [
    ['schema', 0.25, 'schema'],
    ['entity', 0.20, 'entity'],
    ['content', 0.20, 'content'],
    ['structure', 0.15, 'structure'],
    ['crawlable', 0.10, 'crawlable'],
    ['llms_txt', 0.10, 'llms_txt'],
  ];
  const signal_breakdown = {};
  for (const [key, weight, field] of SIG) {
    const vals = sorted.map(r => r[field]).filter(v => typeof v === 'number');
    const a = vals.length ? Math.round((vals.reduce((x, y) => x + y, 0) / vals.length) * 10) / 10 : 0;
    signal_breakdown[key] = { weight, average: a };
  }

  return { analyzed: sorted, blocked, error, avg, median, dist, top, bottom, signal_breakdown };
}

async function main() {
  const limit = parseInt(process.argv[2] || '', 10) || null;
  const all = readFileSync(DOMAINS_PATH, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const domains = limit ? all.slice(0, limit) : all;

  const results = [];
  let done = 0;
  const queue = [...domains];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const d = queue.shift();
      done++;
      const n = done;
      try {
        const r = await analyze(d);
        results.push(r);
        if (r.status === 'ok') console.log(`[${String(n).padStart(3)}/${domains.length}] ${d.padEnd(24)} ${String(r.score).padStart(5)}  ${r.tier}`);
        else console.log(`[${String(n).padStart(3)}/${domains.length}] ${d.padEnd(24)} ${r.status.toUpperCase().padEnd(8)} ${r.http}`);
      } catch (e) {
        results.push({ domain: d, status: 'error', http: String(e).slice(0, 60), score: null, tier: null });
        console.log(`[${String(n).padStart(3)}/${domains.length}] ${d.padEnd(24)} ERROR   ${String(e).slice(0, 60)}`);
      }
      await new Promise(r => setTimeout(r, 80));
    }
  });
  await Promise.all(workers);

  const s = buildSummary(results);
  const excluded = [...s.blocked, ...s.error].map(r => ({ domain: r.domain, status: r.status, http: r.http }));
  const out = {
    title: 'Top 100 SaaS AI Visibility Scores — RankFixer Core Analysis',
    description: 'AI Visibility scores of SaaS websites, measured by the RankFixer scoring engine across 6 signals: Schema Markup, Entity Density, Content Depth, Structure, Crawlability, and llms.txt presence.',
    methodology: 'For each domain, the homepage, robots.txt, and llms.txt are fetched (RankFixerBot user agent). Schema, entity, content, and structure are parsed from homepage HTML; crawlability from HTTP status; llms.txt from presence. Signals are weighted (schema 0.25, entity 0.20, content 0.20, structure 0.15, crawlable 0.10, llms.txt 0.10) into a 0-100 score. Domains that block the crawler or are unreachable are excluded from summary statistics.',
    date_analyzed: new Date().toISOString().slice(0, 10),
    analyzer_version: 'score.js (site/netlify/functions/score.js)',
    total_domains: results.length,
    analyzed_domains: s.analyzed.length,
    blocked_domains: s.blocked.length,
    error_domains: s.error.length,
    average_score: s.avg,
    median_score: s.median,
    score_distribution: s.dist,
    top_performers: s.top,
    bottom_performers: s.bottom,
    signal_breakdown: s.signal_breakdown,
    excluded_domains: excluded,
    raw_data: s.analyzed,
    data_integrity: {
      note: 'Regenerated on real domains with the deployed score.js engine. Domains that blocked the crawler (HTTP 401/403/406/418/429) or were unreachable are listed in excluded_domains and excluded from average, median, and score_distribution. The prior 7-signal breakdown (backlink_quality, brand_entity_recognition, freshness, Lighthouse-based technical_signals) was removed because no code computes them; category_breakdown and industry_insights were removed as hand-authored.',
      removed_signals: ['backlink_quality', 'brand_entity_recognition', 'freshness'],
      removed_sections: ['category_breakdown', 'industry_insights'],
    },
  };

  if (limit) {
    console.log(`\nSMOKE TEST — ${results.length} domains (no JSON written).`);
    console.log(JSON.stringify({ analyzed: s.analyzed.length, blocked: s.blocked.length, error: s.error.length, avg: s.avg, median: s.median, dist: s.dist }, null, 2));
  } else {
    writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
    console.log(`\nWrote ${OUT_PATH} (total=${results.length}, analyzed=${s.analyzed.length}, blocked=${s.blocked.length}, error=${s.error.length}, avg=${s.avg}, median=${s.median})`);
  }
}

main();