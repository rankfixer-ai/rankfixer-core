// run-audit-cli.js — CLI wrapper for Site Mapper v2
// Usage: node run-audit-cli.js <url>
// Outputs the full audit report as JSON to stdout.
// All console.log output from the pipeline goes to stderr so it doesn't
// contaminate the JSON output on stdout.

import { runDeepAuditV2 } from './audit-report-v2.js';

// Redirect pipeline logging to stderr so stdout stays clean JSON
const originalLog = console.log;
console.log = (...args) => process.stderr.write(args.join(' ') + '\n');

const url = process.argv[2];

if (!url) {
    process.stderr.write('Usage: node run-audit-cli.js <url>\n');
    process.exit(1);
}

// Basic URL validation
try {
    new URL(url);
} catch {
    process.stderr.write(JSON.stringify({ error: `Invalid URL: ${url}` }));
    process.exit(1);
}

try {
    const report = await runDeepAuditV2(url);
    process.stdout.write(JSON.stringify(report));
    process.exit(0);
} catch (err) {
    process.stderr.write(JSON.stringify({ error: err.message }));
    process.exit(1);
}
