// bridge-server.js
// Site Mapper Bridge — wraps the audit engine as a REST endpoint
// Start with: node platform/bridge-server.js
// POST /api/audit  { url: "https://..." }

import http from 'http';
import { runDeepAuditV2 } from '../rankfixer-mapper/audit-report-v2.js';

const PORT = process.env.PORT || 3003;

const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Health check
    if (req.method === 'GET' && req.url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', engine: 'Site Mapper v2' }));
        return;
    }

    // Run audit
    if (req.method === 'POST' && req.url === '/api/audit') {
        try {
            const body = await readBody(req);
            const { url } = JSON.parse(body);

            if (!url) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Missing "url" in request body' }));
                return;
            }

            console.log(`\n═══ Audit requested: ${url} ═══`);
            const startTime = Date.now();

            const report = await runDeepAuditV2(url);

            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`Audit complete: ${duration}s`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, duration: `${duration}s`, report }));
        } catch (err) {
            console.error('Audit failed:', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

server.listen(PORT, '127.0.0.1', () => {
    console.log(`\n═══════════════════════════════════════════`);
    console.log(`  Site Mapper Bridge Server`);
    console.log(`  http://127.0.0.1:${PORT}`);
    console.log(`  POST /api/audit  { "url": "https://..." }`);
    console.log(`═══════════════════════════════════════════\n`);
});
