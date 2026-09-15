import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const checks = [];

function assert(condition, message) {
  checks.push({ ok: !!condition, message });
}

// --- score.js ---
const scoreJs = fs.readFileSync(path.join(__dirname, 'site/netlify/functions/score.js'), 'utf8');
assert(scoreJs.includes("Access-Control-Allow-Origin': '*'"), 'score.js: CORS allows all origins (wildcard)');
assert(scoreJs.includes('schema:') && scoreJs.includes('entity:') && scoreJs.includes('content:') && scoreJs.includes('structure:') && scoreJs.includes('crawlable:'), 'score.js: weighted scoring covers 5 dimensions');
assert(scoreJs.includes('llmsTxt:'), 'score.js: includes llmsTxt dimension');
assert(scoreJs.includes('RankFixerBot'), 'score.js: uses RankFixerBot user-agent');

// --- home.html ---
const homeHtml = fs.readFileSync(path.join(__dirname, 'site/index.html'), 'utf8');
assert(homeHtml.includes('netlify-honeypot'), 'home: contact form has bot protection honeypot');
assert(homeHtml.includes('acibronjan@gmail.com'), 'home: still uses personal email (not yet migrated)');

// --- checker.html ---
const checkerHtml = fs.readFileSync(path.join(__dirname, 'site/ai-visibility-checker/index.html'), 'utf8');
assert(checkerHtml.includes('ai-visibility-checker'), 'checker: page identifier present');
assert(checkerHtml.includes('Free AI Visibility'), 'checker: page has Free AI Visibility title');

// --- report.html ---
const reportHtml = fs.readFileSync(path.join(__dirname, 'site/report/index.html'), 'utf8');
assert(reportHtml.includes('RankFixer'), 'report: page has brand name');
assert(reportHtml.includes('acibronjan@gmail.com'), 'report: still uses personal email');

console.log('\\\\nRankFixer QA Baseline\\\\n');
let failed = 0;
for (const c of checks) {
  const prefix = c.ok ? '✅' : '❌';
  console.log(`${prefix} ${c.message}`);
  if (!c.ok) failed++;
}
console.log(`\\\\nChecks: ${checks.length}, Passed: ${checks.length - failed}, Failed: ${failed}`);
if (failed) process.exitCode = 1;
