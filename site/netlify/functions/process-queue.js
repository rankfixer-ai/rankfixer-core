// Netlify Scheduled Function: process the report queue.
// Path: site/netlify/functions/process-queue.js
// Schedule (netlify.toml): */5 * * * *
// Scans checkout_sessions Blobs for PROCESSING records, runs the analyzer,
// renders an HTML report, stores it, emails the customer, and marks COMPLETED.
import { getStore } from '@netlify/blobs';
import { scoreCrawlable, scoreSchema, scoreEntity, scoreContent, scoreStructure, detectStatus } from './score.js';
import { renderReport } from '../helpers/render-report.js';
import { renderEmail } from '../helpers/email-template.js';

const WEIGHTS = { schema: 0.25, entity: 0.20, content: 0.20, structure: 0.15, crawlable: 0.10, llmsTxt: 0.10 };
const UA = { 'User-Agent': 'RankFixerBot/1.0 (+https://rankfixer.co)' };

async function analyzeDomain(domain) {
  const base = 'https://' + domain;
  const [htmlRes, robotsRes, llmsRes] = await Promise.allSettled([
    fetch(base + '/', { headers: UA, redirect: 'follow' }),
    fetch(base + '/robots.txt', { headers: UA }),
    fetch(base + '/llms.txt', { headers: UA }),
  ]);
  const status = detectStatus(htmlRes);
  if (status !== 'ok') {
    return { domain, status, score: null, error: status };
  }
  let html = '';
  try { html = await htmlRes.value.text(); } catch (_) {}
  const dims = {
    crawlable: scoreCrawlable(htmlRes, robotsRes),
    schema: html ? scoreSchema(html) : 0,
    entity: html ? scoreEntity(html) : 0,
    content: html ? scoreContent(html) : 0,
    structure: html ? scoreStructure(html) : 0,
    llmsTxt: (llmsRes.status === 'fulfilled' && llmsRes.value.ok) ? 100 : 0,
  };
  let total = 0;
  for (const k in WEIGHTS) total += (dims[k] || 0) * WEIGHTS[k];
  return {
    domain, status: 'ok', score: Math.round(total),
    schema: dims.schema, entity: dims.entity, content: dims.content,
    structure: dims.structure, crawlable: dims.crawlable, llms_txt: dims.llmsTxt,
  };
}

async function sendEmail(session, domain, reportUrl) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !session.customer_email) {
    console.log('EMAIL_SKIPPED', domain);
    return;
  }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: session.customer_email,
      subject: 'Your RankFixer AI Visibility Report for ' + domain,
      html: renderEmail(domain, reportUrl, process.env.URL || 'https://rankfixer.co'),
    });
    console.log('EMAIL_SENT', domain);
  } catch (e) {
    console.error('EMAIL_FAILED', domain, String((e && e.message) || e));
  }
}

export const scheduled = async () => {
  const sessionsStore = getStore('checkout_sessions');
  const reportsStore = getStore('reports');

  let list;
  try {
    list = await sessionsStore.list();
  } catch (e) {
    console.error('LIST_FAILED', String((e && e.message) || e));
    return;
  }
  const blobs = (list && list.blobs) || [];
  if (!blobs.length) {
    console.log('QUEUE_EMPTY');
    return;
  }

  for (const blob of blobs) {
    let session;
    try {
      const raw = await sessionsStore.get(blob.key);
      session = raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('GET_FAILED', blob.key, String((e && e.message) || e));
      continue;
    }
    if (!session || session.status !== 'PROCESSING') continue;

    const domain = session.domain;
    if (!domain) {
      session.status = 'FAILED';
      session.error = 'missing_domain';
      await sessionsStore.set(blob.key, JSON.stringify(session));
      console.log('MARKED_FAILED missing_domain', blob.key);
      continue;
    }

    try {
      const result = await analyzeDomain(domain);
      if (result.status !== 'ok') {
        session.status = 'FAILED';
        session.error = 'analyzer_' + result.status;
        await sessionsStore.set(blob.key, JSON.stringify(session));
        console.log('MARKED_FAILED', domain, result.status);
        continue;
      }

      const html = renderReport(domain, result);
      await reportsStore.set(blob.key, html);

      session.status = 'COMPLETED';
      session.report_url = '/.netlify/functions/get-report?session_id=' + encodeURIComponent(blob.key);
      await sessionsStore.set(blob.key, JSON.stringify(session));

      await sendEmail(session, domain, session.report_url);
      console.log('REPORT_COMPLETED', domain);
    } catch (e) {
      console.error('PROCESS_FAILED', domain, String((e && e.message) || e));
      session.attempts = (session.attempts || 0) + 1;
      if (session.attempts >= 3) {
        session.status = 'FAILED';
        session.error = String((e && e.message) || e).slice(0, 200);
      }
      await sessionsStore.set(blob.key, JSON.stringify(session));
    }
  }
};