// test-v2.js — Site Mapper v2 Integration Test Runner
import { runDeepAuditV2 } from './audit-report-v2.js';
import fs from 'fs';

const targets = [
    { url: 'https://www.allbirds.com', label: 'Allbirds (E-commerce)' },
    { url: 'https://developers.google.com/search/blog', label: 'Google Search Blog (Content)' },
    { url: 'https://docs.github.com', label: 'GitHub Docs (Documentation)' }
];

for (const t of targets) {
    console.log(`\n━━━ ${t.label} ━━━`);
    try {
        const report = await runDeepAuditV2(t.url);
        console.log(`Site: ${report.site.archetype} | ${report.site.totalPages} pages | ${report.site.templatesDiscovered} templates`);
        for (const tp of report.templates) {
            console.log(`  ${tp.pattern} → ${tp.pageType} (${tp.instanceCount} pages)`);
            for (const i of tp.templateIssues) {
                console.log(`    [${i.severity.toUpperCase()}] ${i.type}: ${i.message} (~${i.estimatedAffectedPages} pages)`);
            }
        }
        if (report.globalContradictions.length) {
            console.log(`  Global:`);
            for (const c of report.globalContradictions.slice(0, 5)) {
                console.log(`    [${c.severity.toUpperCase()}] ${c.type}: ${c.message}`);
            }
        }
        const fn = `v2-audit-${t.label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
        fs.writeFileSync(fn, JSON.stringify(report, null, 2));
        console.log(`  Saved: ${fn}`);
    } catch (e) {
        console.error(`  FAILED: ${e.message}`);
        console.error(e.stack);
    }
}
console.log('\nDone.');
