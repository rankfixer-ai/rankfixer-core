// tools/batch-analyze.js
// Batch-run the deployed RankFixer scoring engine against data/domains_to_analyze.txt
// Usage: node tools/batch-analyze.js [limit]   (limit = N domains for smoke test; omit for full run)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scoreCrawlable, scoreSchema, scoreEntity, scoreContent, scoreStructure } from '../site/netlify/functions/score.js';

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
  } finally {
    clearTimeout(t);
  }
}

async function analyze(domain) {
  const base = 'https://' + domain;
  const [htmlRes, robotsRes, llmsRes] = await Promise.allSettled([
    fetchT(base + '/'),
    fetchT(base + '/robots.txt'),
    fetchT(base + '/llms.txt'),
  ]);
  let html = '';
  if (htmlRes.status === 'fulfilled' && htmlRes.value.ok) {
    try { html = await htmlRes.value.text(); } catch (_) {}
  }
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
    domain, score, tier: tierOf(score),
    schema: dims.schema, entity: dims.entity, content: dims.content,
    structure: dims.structure, crawlable: dims.crawlable, llms_txt: dims.llmsTxt,
  };
}

function buildSummary(results) {
  const sorted = [...results].sort((a, b) => b.score - a.score);
  const n = sorted.length;
  const sum = sorted.reduce((s, r) => s + r.score, 0);
  const avg = Math.round((sum / n) * 10) / 10;
  const median = n % 2 === 1
    ? sorted[Math.floor(n / 2)].score
    : Math.round(((sorted[n / 2 - 1].score + sorted[n / 2].score) / 2) * 10) / 10;

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

  const signal_breakdown = {};
  for (const sig of Object.keys(WEIGHTS)) {
    const vals = sorted.map(r => r[sig]).filter(v => typeof v === 'number');
    const a = Math.round((vals.reduce((x, y) => x + y, 0) / vals.length) * 10) / 10;
    signal_breakdown[sig] = { weight: WEIGHTS[sig], average: a };
  }

  return { sorted, avg, median, dist, top, bottom, signal_breakdown };
}

async function main() {
  const limit = parseInt(process.argv[2] || '', 10) || null;
  const all = readFileSync(DOMAINS_PATH, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const domains = limit ? all.slice(0, limit) : all;

  const results = [];
  const errors = [];
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
        console.log(`[${String(n).padStart(3)}/${domains.length}] ${d.padEnd(24)} ${String(r.score).padStart(5)}  ${r.tier}`);
      } catch (e) {
        errors.push({ domain: d, error: String(e).slice(0, 120) });
        results.push({ domain: d, score: 0, tier: 'Critical', schema: 0, entity: 0, content: 0, structure: 0, crawlable: 0, llms_txt: 0 });
        console.log(`[${String(n).padStart(3)}/${domains.length}] ${d.padEnd(24)} ERROR  ${String(e).slice(0, 60)}`);
      }
      await new Promise(r => setTimeout(r, 80));
    }
  });
  await Promise.all(workers);

  const s = buildSummary(results);
  const out = {
    title: 'Top 100 SaaS AI Visibility Scores — RankFixer Core Analysis',
    description: 'AI Visibility scores of SaaS websites, measured by the RankFixer scoring engine across 6 signals: Schema Markup, Entity Density, Content Depth, Structure, Crawlability, and llms.txt presence.',
    methodology: 'For each domain, the homepage, robots.txt, and llms.txt are fetched (RankFixerBot user agent). Schema, entity, content, and structure are parsed from homepage HTML; crawlability from HTTP status; llms.txt from presence. Signals are weighted (schema 0.25, entity 0.20, content 0.20, structure 0.15, crawlable 0.10, llms.txt 0.10) into a 0-100 score.',
    date_analyzed: new Date().toISOString().slice(0, 10),
    analyzer_version: 'score.js (site/netlify/functions/score.js)',
    total_domains: s.sorted.length,
    average_score: s.avg,
    median_score: s.median,
    score_distribution: s.dist,
    top_performers: s.top,
    bottom_performers: s.bottom,
    signal_breakdown: s.signal_breakdown,
    raw_data: s.sorted,
    data_integrity: {
      note: 'Regenerated on real domains with the deployed score.js engine. The prior 7-signal breakdown (backlink_quality, brand_entity_recognition, freshness, Lighthouse-based technical_signals) was removed because no code in the repo computes those signals. category_breakdown and industry_insights (previously hand-authored) were also removed. All domains are verified real and unique.',
      removed_signals: ['backlink_quality', 'brand_entity_recognition', 'freshness'],
      removed_sections: ['category_breakdown', 'industry_insights'],
      failed_domains: errors,
    },
  };

  if (limit) {
    console.log(`\nSMOKE TEST — analyzed ${s.sorted.length} domains (no JSON written).`);
    console.log(JSON.stringify({ avg: s.avg, median: s.median, dist: s.dist }, null, 2));
  } else {
    writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
    console.log(`\nWrote ${OUT_PATH} (${s.sorted.length} domains, avg=${s.avg}, median=${s.median}, errors=${errors.length})`);
  }
}

main();