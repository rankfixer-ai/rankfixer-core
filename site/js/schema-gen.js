/* RankFixer Schema/FAQPage JSON-LD Generator
 * Pure client-side. No account, no network calls except analytics.
 */
(function () {
    'use strict';

    var faqList = document.getElementById('faq-list');
    var output = document.getElementById('output');
    var copyStatus = document.getElementById('copy-status');

    // --- FAQ row management ---
    function addFaqRow(q, a) {
        var row = document.createElement('div');
        row.className = 'faq-row';
        row.innerHTML =
            '<div class="field">' +
            '  <label>Question</label>' +
            '  <textarea class="faq-q" rows="2" placeholder="What does your product do?"></textarea>' +
            '</div>' +
            '<div class="field">' +
            '  <label>Answer</label>' +
            '  <textarea class="faq-a" rows="3" placeholder="We help teams..."></textarea>' +
            '</div>' +
            '<div class="faq-actions">' +
            '  <button type="button" class="btn secondary faq-del">Remove</button>' +
            '</div>';
        row.querySelector('.faq-q').value = q || '';
        row.querySelector('.faq-a').value = a || '';
        row.querySelector('.faq-del').addEventListener('click', function () {
            row.remove();
            generate();
        });
        faqList.appendChild(row);
        // regenerate on input
        row.querySelector('.faq-q').addEventListener('input', generate);
        row.querySelector('.faq-a').addEventListener('input', generate);
    }

    document.getElementById('add-faq').addEventListener('click', function () {
        addFaqRow();
        generate();
        if (window.Rfx) Rfx.track('tool_interact', { tool: 'schema_gen', action: 'add_faq' });
    });

    // Start with two empty rows
    addFaqRow('What is AI visibility?', 'AI visibility measures how well LLMs like ChatGPT, Perplexity, and Gemini can extract and cite your content.');
    addFaqRow('Why does schema markup matter for AI?', 'Structured data like FAQPage and Organization schema gives models explicit, machine-readable context about your brand and content.');

    // --- Escape for JSON safety (already JSON.stringify, but guard text) ---
    function clean(s) { return (s || '').trim(); }

    // --- Build schema ---
    function buildSchema() {
        var orgName = clean(document.getElementById('org-name').value);
        var orgUrl = clean(document.getElementById('org-url').value);
        var orgLogo = clean(document.getElementById('org-logo').value);

        var graph = [];

        if (orgName || orgUrl) {
            var org = {
                '@type': 'Organization',
                'name': orgName || 'Your Organization'
            };
            if (orgUrl) { org['url'] = orgUrl; org['@id'] = orgUrl; }
            if (orgLogo) org['logo'] = orgLogo;
            graph.push(org);

            if (orgUrl) {
                graph.push({
                    '@type': 'WebSite',
                    'name': orgName || 'Your Website',
                    'url': orgUrl
                });
            }
        }

        // FAQPage
        var faqs = [];
        var rows = faqList.querySelectorAll('.faq-row');
        for (var i = 0; i < rows.length; i++) {
            var q = clean(rows[i].querySelector('.faq-q').value);
            var a = clean(rows[i].querySelector('.faq-a').value);
            if (q && a) {
                faqs.push({
                    '@type': 'Question',
                    'name': q,
                    'acceptedAnswer': { '@type': 'Answer', 'text': a }
                });
            }
        }

        var root = { '@context': 'https://schema.org' };
        if (faqs.length) {
            graph.push({ '@type': 'FAQPage', 'mainEntity': faqs });
        }
        if (graph.length === 1) {
            // single node — embed directly
            root = Object.assign(root, graph[0]);
        } else if (graph.length > 1) {
            root['@graph'] = graph;
        } else {
            return null; // nothing to generate
        }
        return root;
    }

    window._rfixLastSchema = null;
    function generate() {
        var schema = buildSchema();
        if (!schema) {
            output.textContent = 'Fill in your organization name/URL and at least one complete FAQ to generate schema.';
            window._rfixLastSchema = null;
            return;
        }
        var json = JSON.stringify(schema, null, 2);
        output.textContent = json;
        window._rfixLastSchema = json;
    }

    // regenerate on org field input
    ['org-name', 'org-url', 'org-logo'].forEach(function (id) {
        document.getElementById(id).addEventListener('input', generate);
    });

    generate(); // initial render with defaults

    // --- Copy ---
    document.getElementById('copy-btn').addEventListener('click', function () {
        if (!window._rfixLastSchema) return;
        var done = function () {
            copyStatus.textContent = 'Copied ✓';
            setTimeout(function () { copyStatus.textContent = ''; }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(window._rfixLastSchema).then(done, fallbackCopy);
        } else {
            fallbackCopy();
        }
        function fallbackCopy() {
            var ta = document.createElement('textarea');
            ta.value = window._rfixLastSchema;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); done(); } catch (e) {}
            document.body.removeChild(ta);
        }
        if (window.Rfx) Rfx.track('tool_interact', { tool: 'schema_gen', action: 'copy' });
    });

    // --- Download ---
    document.getElementById('download-btn').addEventListener('click', function () {
        if (!window._rfixLastSchema) return;
        var blob = new Blob([window._rfixLastSchema], { type: 'application/ld+json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'schema.jsonld';
        a.click();
        URL.revokeObjectURL(url);
        if (window.Rfx) Rfx.track('tool_interact', { tool: 'schema_gen', action: 'download' });
    });

    // --- CTA + page tracking ---
    if (window.Rfx) {
        Rfx.track('tool_viewed', { tool: 'schema_gen' });
        var cta = document.getElementById('cta-report');
        if (cta) {
            cta.addEventListener('click', function () {
                Rfx.track('pricing_click', { button_text: 'Get Full Report', section: 'schema_gen_cta', plan: 'report_99' });
                Rfx.track('upgrade_plan', { plan: 'report_99' });
            });
        }
        // Nav clicks
        var navLinks = document.querySelectorAll('.nav-links a');
        for (var n = 0; n < navLinks.length; n++) {
            navLinks[n].addEventListener('click', function () {
                var t = (this.textContent || '').trim();
                var h = this.getAttribute('href') || '';
                if (/github/i.test(t) || /github/i.test(h)) {
                    Rfx.track('github_click', { button_text: t, section: 'nav' });
                } else {
                    Rfx.track('navigation_click', { link_text: t, href: h });
                }
            });
        }
        // Footer
        var footLinks = document.querySelectorAll('.site-footer a');
        for (var f = 0; f < footLinks.length; f++) {
            footLinks[f].addEventListener('click', function () {
                Rfx.track('footer_cta', { link_text: (this.textContent || '').trim(), href: this.getAttribute('href') || '' });
            });
        }
    }
})();
