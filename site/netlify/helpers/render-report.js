// Pure module: render a self-contained AI Visibility report (HTML, dark theme).
// Not a Netlify function — lives in helpers/ and is imported by process-queue.js.
export function renderReport(domain, r) {
  const score = r.score == null ? null : r.score;
  const tier = score == null ? 'Blocked' : (score >= 81 ? 'Excellent' : score >= 61 ? 'Good' : score >= 41 ? 'Fair' : score >= 21 ? 'Poor' : 'Critical');
  const signals = [
    ['Schema Markup', r.schema, 'JSON-LD Organization, WebSite, FAQPage, Product, Article, HowTo'],
    ['Entity Signals', r.entity, '@id references, sameAs links, Open Graph / Twitter Card tags'],
    ['Content Depth', r.content, 'Word count, FAQ-style headings, lists, meta description'],
    ['Structure', r.structure, 'Heading hierarchy, nav/main landmarks, microdata'],
    ['Crawlability', r.crawlable, 'Homepage HTTP status + robots.txt presence'],
    ['llms.txt', r.llms_txt, 'llms.txt file at the domain root'],
  ];
  const bars = signals.map(([name, val, desc]) => {
    const v = Math.max(0, Math.min(100, val == null ? 0 : val));
    return `
      <div class="sig">
        <div class="sig-head"><span>${name}</span><span class="val">${v}/100</span></div>
        <div class="bar"><div class="fill" style="width:${v}%"></div></div>
        <div class="sig-desc">${desc}</div>
      </div>`;
  }).join('');
  const recs = recommendations(r).map((x) => '<li>' + x + '</li>').join('');
  const date = new Date().toISOString().slice(0, 10);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Visibility Report — ${escapeHtml(domain)}</title>
<style>
  :root { --bg:#0d0d1a; --panel:#151527; --panel2:#1c1c31; --text:#e8e8f2; --muted:#9a9ab5; --accent:#6c5ce7; --good:#2ecc71; --warn:#f1c40f; --bad:#e74c3c; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; padding: 32px 16px; }
  .wrap { max-width: 720px; margin: 0 auto; }
  header { padding: 28px; background: linear-gradient(135deg, var(--panel) 0%, var(--panel2) 100%); border: 1px solid #2a2a44; border-radius: 16px; margin-bottom: 20px; }
  .logo { font-weight: 800; letter-spacing: .5px; color: var(--accent); font-size: 15px; text-transform: uppercase; }
  .kicker { color: var(--muted); font-size: 13px; margin-top: 14px; text-transform: uppercase; letter-spacing: 1.5px; }
  h1 { font-size: 26px; margin-top: 6px; word-break: break-all; }
  .score-row { display: flex; align-items: baseline; gap: 14px; margin-top: 18px; }
  .score { font-size: 64px; font-weight: 800; line-height: 1; color: var(--accent); }
  .tier { font-size: 18px; font-weight: 600; color: var(--text); }
  .sub { color: var(--muted); font-size: 13px; margin-top: 14px; }
  section { background: var(--panel); border: 1px solid #2a2a44; border-radius: 16px; padding: 24px 28px; margin-bottom: 20px; }
  h2 { font-size: 16px; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); }
  .sig { margin-bottom: 18px; }
  .sig:last-child { margin-bottom: 0; }
  .sig-head { display: flex; justify-content: space-between; font-size: 14px; font-weight: 600; margin-bottom: 6px; }
  .sig-head .val { color: var(--muted); font-weight: 500; }
  .bar { height: 8px; background: var(--panel2); border-radius: 6px; overflow: hidden; }
  .fill { height: 100%; background: linear-gradient(90deg, var(--accent), #8e7bff); border-radius: 6px; }
  .sig-desc { font-size: 12px; color: var(--muted); margin-top: 6px; }
  ul { padding-left: 20px; }
  li { margin-bottom: 10px; font-size: 14px; color: var(--text); }
  footer { text-align: center; color: var(--muted); font-size: 12px; padding: 8px 0 24px; }
  @media (max-width: 480px) { .score { font-size: 48px; } h1 { font-size: 21px; } }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <div class="logo">RankFixer</div>
      <div class="kicker">AI Visibility Report</div>
      <h1>${escapeHtml(domain)}</h1>
      <div class="score-row">
        <div class="score">${score == null ? 'Blocked' : score}</div>
        <div class="tier">${tier}</div>
      </div>
      <p class="sub">Generated ${date} by the RankFixer scoring engine. Score is out of 100.</p>
    </header>
    <section><h2>Signal breakdown</h2>${bars}</section>
    <section><h2>Recommendations</h2><ul>${recs}</ul></section>
    <footer>RankFixer — Know your AI visibility score.</footer>
  </div>
</body>
</html>`;
}

function recommendations(r) {
  const list = [];
  if (r.schema < 50) list.push('Add JSON-LD Organization + WebSite schema to your homepage — the highest-impact, lowest-effort fix.');
  if (r.entity < 50) list.push('Add @id and sameAs entity links to connect your brand to authoritative sources.');
  if (r.llms_txt === 0) list.push('Publish an llms.txt file at your domain root so AI crawlers can parse your site.');
  if (r.content < 50) list.push('Add FAQ-style headings and structured lists to your key pages.');
  if (r.crawlable < 80) list.push('Ensure your homepage returns HTTP 200 and keep robots.txt reachable.');
  if (list.length === 0) list.push('Your fundamentals are strong. Push into the Excellent tier by tightening schema completeness and entity linking.');
  return list;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}