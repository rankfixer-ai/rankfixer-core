(function () {
  'use strict';

  function track(name, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params || {});
    }
  }

  function getLink(el) {
    while (el && el.tagName !== 'A') el = el.parentElement;
    return el;
  }

  // CTA clicks
  document.addEventListener('click', function (e) {
    var link = getLink(e.target);
    if (!link || !link.href) return;

    // CTA block clicks
    if (link.closest('.cta-block')) {
      var ctaType = 'unknown';
      var href = link.href.toLowerCase();
      if (href.indexOf('/research') !== -1) ctaType = 'research';
      else if (href.indexOf('/portfolio') !== -1) ctaType = 'portfolio';
      else if (href.indexOf('/contact') !== -1) ctaType = 'contact';

      track('cta_click', {
        cta_type: ctaType,
        link_url: link.href,
        link_text: (link.textContent || '').trim().substring(0, 100)
      });
      return;
    }

    // External links
    if (link.hostname && link.hostname !== window.location.hostname && !link.href.startsWith('javascript:')) {
      track('external_link', {
        link_domain: link.hostname,
        link_url: link.href
      });
    }
  });

  // Form submit
  document.addEventListener('submit', function (e) {
    var form = e.target;
    // NB: form.name returns the <input name="name"> element (named-property
    // shadowing), so use getAttribute to get the actual form name.
    var formName = form.getAttribute && form.getAttribute('name');
    if (form.tagName === 'FORM' && formName) {
      track('form_submit', {
        form_name: formName
      });
    }
  });

  // Scroll depth 90% (once)
  var scrollTracked = false;
  window.addEventListener('scroll', function () {
    if (scrollTracked) return;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;
    var progress = (window.scrollY / docHeight) * 100;
    if (progress >= 90) {
      scrollTracked = true;
      track('scroll_90', {
        page_title: document.title
      });
    }
  }, { passive: true });
})();
