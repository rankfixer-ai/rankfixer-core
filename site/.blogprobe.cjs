const fs = require('fs');
const files = [
 'ai-citation-management-for-local-businesses',
 'ai-driven-predictive-seo-for-zero-click-serps',
 'ai-visibility-auditing-for-local-businesses',
 'ai-visibility-audits-for-enterprise-knowledge-graphs',
 'ANNOUNCEMENTS',
 'ecosystem_authority_bundle',
 'geo-for-developers-freelancers-business-owners-the-2025-playbook',
 'geo-llm-visibility-the-developer-s-freelancer-s-and-ceo-s-playbook-for-ai-search',
 'geo-vs-seo-the-definitive-guide-to-winning-generative-engine-rankings',
 'how-to-rank-for-ai-overviews-a-blogger-s-guide-to-ai-visibility',
 'how-to-rank-for-ai-overviews-a-blogger-s-guide-to-geo-success',
 'how-to-rank-in-ai-overviews-the-2025-aeo-playbook-for-bloggers',
 'how-to-rank-in-ai-overviews-the-2025-geo-playbook-for-bloggers',
 'how-to-rank-in-ai-overviews-the-2025-geo-playbook-for-marketers',
 'PREDICTIVE_ROADMAP',
 'SOVEREIGN_AUTHORITY',
 'why-is-my-blog-not-ranking-on-google-7-ai-era-fixes-that-actually-work',
 'why-is-my-blog-not-ranking-on-google-and-how-to-fix-it-in-2025'
];
function strip(s){ return s.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<style[\s\S]*?<\/style>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); }
for (const f of files) {
  const p = 'blog/' + f + '.html';
  let s;
  try { s = fs.readFileSync(p, 'utf8'); } catch(e) { console.log('### ' + f + '  MISSING'); continue; }
  // grab paragraphs, skip nav/footer
  const ps = s.match(/<p[^>]*>([\s\S]*?)<\/p>/g) || [];
  const texts = ps.map(p => strip(p)).filter(t => t.length > 40).slice(0, 3);
  console.log('### ' + f);
  texts.forEach((t,i) => console.log('  P' + (i+1) + ': ' + t.slice(0, 220)));
  if (!texts.length) console.log('  (no body paragraphs found)');
}
