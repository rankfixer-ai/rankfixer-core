// Pure module: email HTML template (dark theme, report link).
// Not a Netlify function — lives in helpers/ and is imported by process-queue.js.
export function renderEmail(domain, reportUrl, siteUrl) {
  const base = siteUrl || 'https://rankfixer.co';
  const link = reportUrl.startsWith('http') ? reportUrl : base.replace(/\/+$/, '') + reportUrl;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0d0d1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e8e8f2;line-height:1.6;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="font-weight:800;letter-spacing:.5px;color:#6c5ce7;font-size:15px;text-transform:uppercase;">RankFixer</div>
    <h1 style="font-size:22px;margin:18px 0 8px;">Your AI Visibility Report is ready</h1>
    <p style="font-size:15px;color:#c9c9dd;margin:0 0 6px;">Domain: <strong style="color:#e8e8f2;">${escapeHtml(domain)}</strong></p>
    <p style="font-size:15px;color:#9a9ab5;margin:0 0 24px;">We scored how visible your site is to AI assistants and crawlers, and what to fix.</p>
    <a href="${link}" style="display:inline-block;background:#6c5ce7;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:9px;">View my report</a>
    <p style="font-size:13px;color:#9a9ab5;margin:24px 0 0;">If the button doesn't work, copy this link:<br><a href="${link}" style="color:#8e7bff;word-break:break-all;">${link}</a></p>
    <p style="font-size:12px;color:#6b6b88;margin:32px 0 0;">RankFixer — Know your AI visibility score.</p>
  </div>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}