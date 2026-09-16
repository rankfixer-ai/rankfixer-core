// Netlify Function: serve a generated report as HTML.
// Path: site/netlify/functions/get-report.js
import { getStore } from '@netlify/blobs';

export async function handler(event) {
  const sessionId = (event.queryStringParameters && event.queryStringParameters.session_id) || '';
  if (!sessionId) {
    return { statusCode: 400, body: 'missing session_id' };
  }
  try {
    const store = getStore('reports');
    const html = await store.get(sessionId);
    if (!html) {
      return { statusCode: 404, body: 'Report not ready yet' };
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, max-age=3600' },
      body: html,
    };
  } catch (e) {
    return { statusCode: 500, body: 'error_retrieving_report' };
  }
}