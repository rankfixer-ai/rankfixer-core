// analytics.js — Umami analytics wrapper for RankFixer
// Privacy-first, no cookies, no PII. Free cloud tier at cloud.umami.is.
//
// Setup:
//   1. Go to https://cloud.umami.is and create a free account
//   2. Add a website → get your Website ID (looks like a UUID)
//   3. Replace RANKFIXER_ANALYTICS_ID below with your Website ID
//   4. Dashboard: https://cloud.umami.is/websites/<your-website-id>
//
// Custom events appear under "Events" in the Umami dashboard.

(function () {
    'use strict';

    var SCRIPT_URL = 'https://cloud.umami.is/script.js';
    var WEBSITE_ID = '16392573-609e-4c6e-8bc6-caef82a8d952';

    // Inject Umami script (defer: non-blocking, fires after DOMContentLoaded)
    var script = document.createElement('script');
    script.defer = true;
    script.src = SCRIPT_URL;
    script.setAttribute('data-website-id', WEBSITE_ID);
    // Do not track any personal data
    script.setAttribute('data-do-not-track', 'true');
    document.head.appendChild(script);

    // ---- Public API ----

    /**
     * Track a custom funnel event.
     * Safe to call before Umami finishes loading — events are queued.
     *
     * @param {string} name  Human-readable event name (shows in dashboard)
     * @param {object} [props]  Optional key-value metadata (NO PII)
     */
    window.trackEvent = function (name, props) {
        if (typeof umami !== 'undefined' && umami.track) {
            umami.track(name, props);
        } else {
            (window._rfixQueue = window._rfixQueue || []).push({ name: name, props: props || {} });
        }
    };

    // Flush queued events once Umami is ready
    function flushQueue() {
        var q = window._rfixQueue;
        if (q && q.length && typeof umami !== 'undefined' && umami.track) {
            var i;
            for (i = 0; i < q.length; i++) {
                umami.track(q[i].name, q[i].props);
            }
            window._rfixQueue = [];
        }
    }

    if (document.readyState === 'complete') {
        setTimeout(flushQueue, 1000);
    } else {
        window.addEventListener('load', function () { setTimeout(flushQueue, 1000); });
    }
})();
