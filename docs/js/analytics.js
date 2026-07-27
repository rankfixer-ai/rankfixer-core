/**
 * analytics.js — Centralized Analytics Service for RankFixer
 * ===========================================================
 *
 * Backend-agnostic event layer. Currently targets Umami (privacy-first,
 * no cookies, no PII). Swappable to GA4 by replacing the `_send()` adapter.
 *
 * DESIGN:
 *   - All events route through `Rfx.track(name, params)`.
 *   - Queue system: events fire immediately if Umami is ready, otherwise
 *     they're queued and flushed on load.
 *   - Deduplication: same (name, params.page) within 200ms is suppressed.
 *   - Graceful failure: if analytics is blocked/offline, events are silently
 *     dropped — the site works perfectly without them.
 *   - Scroll tracking: fires scroll_25/50/75/100 once per page load.
 *   - Error tracking: global error handler + manual `Rfx.error()`.
 *   - Performance: captures page_load_time on window load.
 *
 * USAGE:
 *   <script src="/js/analytics.js"></script>
 *   Rfx.track('hero_cta_click', { button_text: 'Check Your AI Visibility', page: '/' });
 *
 * CONVERSIONS (marked with ⚡):
 *   run_audit, audit_completed, email_signup, waitlist_join, demo_request,
 *   contact_form_submit, upgrade_plan
 */

(function () {
    'use strict';

    /* ====================================================================
     * CONFIG
     * ================================================================== */

    var UMAMI_URL = 'https://cloud.umami.is/script.js';
    var UMAMI_ID  = '16392573-609e-4c6e-8bc6-caef82a8d952';

    // Events that fire at most ONCE per page load (idempotency)
    var ONCE_PER_PAGE = [
        'page_load_time',
        'scroll_25', 'scroll_50', 'scroll_75', 'scroll_100'
    ];

    // Events considered conversions
    var CONVERSIONS = [
        'run_audit', 'audit_completed', 'email_signup', 'waitlist_join',
        'demo_request', 'contact_form_submit', 'upgrade_plan'
    ];

    /* ====================================================================
     * STATE
     * ================================================================== */

    var _ready   = false;
    var _queue   = [];
    var _fired   = {};       // { eventName: true } for ONCE_PER_PAGE
    var _last    = {};       // { key: timestamp } for dedup

    /* ====================================================================
     * HELPERS
     * ================================================================== */

    /** Generate a dedup key: event name + page. */
    function _key(name, params) {
        var page = (params && params.page) ? params.page : location.pathname;
        return name + '|' + page;
    }

    /** Actually send an event to Umami. No-op if umami isn't loaded. */
    function _send(name, data) {
        if (typeof umami !== 'undefined' && umami.track) {
            try { umami.track(name, data); } catch (_) { /* silent */ }
        }
    }

    /** Flush queued events once the library loads. */
    function _flush() {
        if (!_ready) return;
        var q = _queue;
        _queue = [];
        for (var i = 0; i < q.length; i++) {
            _send(q[i].name, q[i].data);
        }
    }

    /** Detect traffic source from referrer / UTM. */
    function _trafficSource() {
        try {
            var p = new URLSearchParams(location.search);
            if (p.get('utm_source'))  return p.get('utm_source');
            if (p.get('utm_medium'))  return p.get('utm_medium');
            if (p.get('utm_campaign')) return p.get('utm_campaign');
        } catch (_) {}
        var ref = document.referrer;
        if (!ref) return 'direct';
        if (ref.indexOf('google.')  !== -1) return 'organic';
        if (ref.indexOf('bing.')    !== -1) return 'organic';
        if (ref.indexOf('duckduckgo') !== -1) return 'organic';
        if (ref.indexOf('twitter.com')  !== -1 || ref.indexOf('x.com') !== -1) return 'social';
        if (ref.indexOf('linkedin.com') !== -1) return 'social';
        if (ref.indexOf('github.com')   !== -1) return 'referral';
        if (ref.indexOf(location.hostname) !== -1) return 'internal';
        return 'referral';
    }

    /** Capture UTM campaign if present. */
    function _campaign() {
        try {
            var p = new URLSearchParams(location.search);
            return p.get('utm_campaign') || '';
        } catch (_) { return ''; }
    }

    /** Auto-enrich params with standard dimensions. */
    function _enrich(params) {
        params = params || {};
        if (!params.page)        params.page        = location.pathname;
        if (!params.traffic_source) params.traffic_source = _trafficSource();
        if (!params.campaign)    params.campaign    = _campaign();
        if (!params.site_language) params.site_language = 'en';
        return params;
    }

    /* ====================================================================
     * PUBLIC API
     * ================================================================== */

    window.Rfx = {

        /**
         * Track a named event with optional parameters.
         *
         * Deduplication: the same (event, page) pair within 200ms is suppressed.
         * Once-per-page events: scroll_*, page_load_time fire at most once.
         *
         * @param {string} name   — Event name from the canonical list
         * @param {object} params — Key-value metadata (NO PII)
         */
        track: function (name, params) {
            var k  = _key(name, params);
            var now = Date.now();

            // Dedup: suppress firehose duplicates (same event + page within 200ms)
            if (_last[k] && (now - _last[k] < 200)) return;
            _last[k] = now;

            // Once-per-page gate
            if (ONCE_PER_PAGE.indexOf(name) !== -1) {
                if (_fired[name]) return;
                _fired[name] = true;
            }

            params = _enrich(params);

            // Tag conversions
            if (CONVERSIONS.indexOf(name) !== -1) {
                params.conversion = true;
            }

            if (_ready) {
                _send(name, params);
            } else {
                _queue.push({ name: name, data: params });
            }
        },

        /**
         * Track a page view. Called automatically on load; call manually
         * for SPA-style navigation.
         */
        pageView: function (params) {
            Rfx.track('page_view', _enrich(params));
        },

        /**
         * Track a conversion event explicitly.
         * @param {string} name — e.g. 'email_signup', 'demo_request'
         */
        conversion: function (name, params) {
            Rfx.track(name, _enrich(params));
        },

        /**
         * Track an error (caught exception, API failure, etc.)
         * @param {string} type    — 'api_error', 'audit_failed', 'js_exception'
         * @param {object} details — { endpoint, status, message }
         */
        error: function (type, details) {
            Rfx.track(type, _enrich(details || {}));
        },

        /**
         * Track performance timing. Called automatically on load.
         */
        perf: function () {
            try {
                var nav = performance.getEntriesByType('navigation')[0];
                if (nav) {
                    Rfx.track('page_load_time', {
                        load_ms: Math.round(nav.loadEventEnd - nav.fetchStart)
                    });
                }
            } catch (_) {}
        },

        /**
         * Get the current traffic source.
         */
        getTrafficSource: _trafficSource,

        /**
         * Get the current campaign (UTM).
         */
        getCampaign: _campaign
    };

    /* ====================================================================
     * BOOTSTRAP
     * ================================================================== */

    // Inject Umami script (non-blocking)
    var script = document.createElement('script');
    script.defer = true;
    script.src  = UMAMI_URL;
    script.setAttribute('data-website-id', UMAMI_ID);
    script.setAttribute('data-do-not-track', 'true');
    script.onload = function () {
        _ready = true;
        _flush();
    };
    document.head.appendChild(script);

    // Fallback: flush every 2s in case onload never fires
    var _poll = setInterval(function () {
        if (typeof umami !== 'undefined' && umami.track) {
            _ready = true;
            _flush();
            clearInterval(_poll);
        }
    }, 2000);
    // Stop polling after 30s
    setTimeout(function () { clearInterval(_poll); }, 30000);

    // Fire page load time once ready
    if (document.readyState === 'complete') {
        setTimeout(Rfx.perf, 500);
    } else {
        window.addEventListener('load', function () { setTimeout(Rfx.perf, 500); });
    }

    /* ====================================================================
     * GLOBAL LISTENERS
     * ================================================================== */

    // -- Scroll depth (once per page load) --
    (function () {
        var milestones = { 25: false, 50: false, 75: false, 100: false };
        function _onScroll() {
            var h  = document.documentElement;
            var pct = Math.round((h.scrollTop + h.clientHeight) / Math.max(h.scrollHeight, 1) * 100);
            Object.keys(milestones).forEach(function (m) {
                if (!milestones[m] && pct >= parseInt(m, 10)) {
                    milestones[m] = true;
                    Rfx.track('scroll_' + m, { scroll_depth: parseInt(m, 10) });
                }
            });
            // Unbind once 100% reached
            if (milestones[100]) {
                window.removeEventListener('scroll', _onScroll, { passive: true });
            }
        }
        window.addEventListener('scroll', _onScroll, { passive: true });
    })();

    // -- Global error tracking --
    window.addEventListener('error', function (e) {
        Rfx.error('js_exception', {
            message: e.message || 'unknown',
            filename: (e.filename || '').replace(location.origin, ''),
            lineno: e.lineno || 0
        });
    });

    // -- Unhandled promise rejections --
    window.addEventListener('unhandledrejection', function (e) {
        Rfx.error('js_exception', {
            message: (e.reason && e.reason.message) ? e.reason.message : 'unhandled rejection'
        });
    });

    /* ====================================================================
     * BACKWARD COMPAT: window.trackEvent (legacy scripts)
     * ================================================================== */
    window.trackEvent = function (name, props) {
        Rfx.track(name, props);
    };

})();
