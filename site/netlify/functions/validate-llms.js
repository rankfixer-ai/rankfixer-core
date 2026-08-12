// Netlify Function: llms.txt validator
// Path: site/netlify/functions/validate-llms.js
// POST { domain } -> fetches https://domain/llms.txt server-side and returns
// honest existence + structure checks (based on the llmstxt.org convention).
// Zero dependencies (global fetch, Node 18+).
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
    domain = (JSON.parse(event.body || '{}').domain || '').trim();
  } catch (_) {}
  if (!domain) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'missing domain' }) };
  }
  domain = domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/^www\./i, '');

  const url = 'https://' + domain + '/llms.txt';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RankFixerBot/1.0 (+https://rankfixer.co)' },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timer);

    const status = res.status;
    const contentType = res.headers.get('content-type') || '';

    if (!res.ok) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          domain, url, exists: false, status, contentType,
          verdict: 'missing',
          message: status === 404
            ? 'No llms.txt file found at the domain root.'
            : 'The llms.txt URL returned HTTP ' + status + '.',
        }),
      };
    }

    const raw = await res.text();
    const size = raw.length;
    const checks = {
      hasHeading: /^#{1,3}\s+\S/m.test(raw),
      hasLinks: /\[[^\]]+\]\(\s*https?:\/\/[^)]+\)/m.test(raw),
      looksLikeMarkdown: /(^#{1,6}\s|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/m.test(raw),
      reasonableSize: size > 20 && size < 200000,
      isText: /^text\//i.test(contentType) || contentType === '',
    };
    const verdict = (checks.hasHeading && checks.hasLinks) ? 'valid' : 'incomplete';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        domain, url, exists: true, status, contentType, size,
        content: raw.slice(0, 3000),
        checks, verdict,
        message: verdict === 'valid'
          ? 'llms.txt found and looks well-formed.'
          : 'llms.txt exists but is missing key structure (a title and/or markdown links).',
      }),
    };
  } catch (e) {
    clearTimeout(timer);
    const aborted = e && e.name === 'AbortError';
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        domain, url, exists: false, status: null, contentType: '',
        verdict: aborted ? 'timeout' : 'error',
        message: aborted
          ? 'Timed out after 12s fetching llms.txt.'
          : 'Could not fetch llms.txt: ' + String((e && e.message) || e).slice(0, 120),
      }),
    };
  }
}