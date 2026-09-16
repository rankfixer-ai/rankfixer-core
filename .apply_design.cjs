const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const htmlPath = path.join(ROOT, 'site', 'index.html');

function L(s) { return s.replace(/\n/g, '\r\n'); }

let html = fs.readFileSync(htmlPath, 'utf8');
if (html.indexOf('\r\n') === -1) {
  throw new Error('Expected CRLF line endings');
}

const edits = [];

// --- Edit 1: head ---
edits.push([
  L('    <meta name="viewport" content="width=device-width, initial-scale=1.0">'),
  L('    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <meta name="theme-color" content="#0D0D1A">\n    <link rel="icon" type="image/svg+xml" href="/images/favicon.svg">\n    <link rel="preconnect" href="https://www.googletagmanager.com">\n    <link rel="preconnect" href="https://www.google-analytics.com">\n    <link rel="dns-prefetch" href="https://script.google.com">')
]);

// --- Edit 2: nav CSS (base) ---
edits.push([
  L('        .nav {\n            display: flex;\n            justify-content: space-between;\n            align-items: center;\n            padding: 1rem 2rem;\n            border-bottom: 1px solid var(--border);\n            background: rgba(13, 13, 26, 0.8);\n            backdrop-filter: blur(10px);\n            position: sticky;\n            top: 0;\n            z-index: 100;\n        }\n        .nav-logo { font-weight: 700; font-size: 1.2rem; text-decoration: none; color: var(--text); }\n        .nav-links { display: flex; gap: 1.5rem; align-items: center; }\n        .nav-links a { text-decoration: none; color: var(--text-muted); font-size: 0.9rem; transition: color 0.2s; }\n        .nav-links a:hover { color: var(--text); }'),
  L('        .nav {\n            display: flex;\n            justify-content: space-between;\n            align-items: center;\n            padding: 0.9rem 2rem;\n            border-bottom: 1px solid var(--border);\n            background: rgba(13, 13, 26, 0.88);\n            position: sticky;\n            top: 0;\n            z-index: 100;\n        }\n        @supports ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {\n            .nav { background: rgba(13, 13, 26, 0.72); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }\n        }\n        .nav-logo {\n            display: inline-flex;\n            align-items: center;\n            gap: 0.55rem;\n            font-weight: 700;\n            font-size: 1.15rem;\n            letter-spacing: -0.01em;\n            text-decoration: none;\n            color: var(--text);\n        }\n        .nav-logo .logo-mark { display: inline-flex; width: 28px; height: 28px; flex: 0 0 auto; }\n        .nav-logo .logo-mark svg { display: block; width: 100%; height: 100%; }\n        .nav-links { display: flex; gap: 1.5rem; align-items: center; }\n        .nav-links a { text-decoration: none; color: var(--text-muted); font-size: 0.9rem; transition: color 0.2s; }\n        .nav-links a:hover { color: var(--text); }\n        .nav-toggle {\n            display: none;\n            flex-direction: column;\n            align-items: center;\n            justify-content: center;\n            gap: 5px;\n            width: 40px;\n            height: 40px;\n            background: transparent;\n            border: 1px solid var(--border);\n            border-radius: var(--radius-sm);\n            cursor: pointer;\n            padding: 0;\n        }\n        .nav-toggle span { display: block; width: 18px; height: 2px; background: var(--text); border-radius: 2px; transition: transform 0.2s ease, opacity 0.2s ease; }\n        .nav-toggle[aria-expanded="true"] span:nth-child(1) { transform: translateY(7px) rotate(45deg); }\n        .nav-toggle[aria-expanded="true"] span:nth-child(2) { opacity: 0; }\n        .nav-toggle[aria-expanded="true"] span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }\n\n        /* Perf: defer layout/paint of below-the-fold sections */\n        .social-proof, .testimonials, .pricing, .github-cta, .contact-section, .hire-cta, .site-footer {\n            content-visibility: auto;\n            contain-intrinsic-size: auto 640px;\n        }')
]);

// --- Edit 3: mobile nav lines (768px block) ---
edits.push([
  L('            .nav { flex-direction: column; gap: 0.5rem; padding: 0.75rem 1rem; }\n            .nav-links { flex-wrap: wrap; justify-content: center; gap: 0.75rem 1rem; }\n            .nav-links a { font-size: 0.85rem; }'),
  L('            .nav { padding: 0.7rem 1rem; }\n            .nav-toggle { display: flex; }\n            .nav-links {\n                display: none;\n                position: absolute;\n                top: 100%;\n                left: 0;\n                right: 0;\n                flex-direction: column;\n                align-items: stretch;\n                gap: 0;\n                background: var(--bg-card);\n                border-bottom: 1px solid var(--border);\n                padding: 0.25rem 1.25rem 0.5rem;\n                box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);\n            }\n            .nav-links.open { display: flex; }\n            .nav-links a { font-size: 1rem; padding: 0.8rem 0; border-bottom: 1px solid var(--border); }\n            .nav-links a:last-child { border-bottom: none; }')
]);

// --- Edit 4: dedupe Global Mobile Fix block ---
edits.push([
  L('/* Global Mobile Fix */\n        * {\n            box-sizing: border-box;\n        }\n        body {\n            overflow-x: hidden;\n            width: 100%;\n        }'),
  L('        body { overflow-x: hidden; width: 100%; }')
]);

// --- Edit 5: remove 480px nav rule that breaks the hamburger ---
edits.push([
  L('            /* Force nav links to wrap cleanly or shrink to fit */\n            nav, .nav, header ul {\n                flex-wrap: wrap;\n                justify-content: center;\n                gap: 5px;\n                font-size: 0.8rem;\n                padding: 0 10px;\n            }\n\n            /* Ensure input and button stack vertically and take full width */'),
  L('            /* Ensure input and button stack vertically and take full width */')
]);

// --- Edit 6: nav HTML ---
edits.push([
  L('    <nav class="nav">\n        <a href="/" class="nav-logo">Rankfixer</a>\n        <div class="nav-links">'),
  L('    <nav class="nav">\n        <a href="/" class="nav-logo" aria-label="Rankfixer home">\n            <span class="logo-mark" aria-hidden="true"><svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="9" fill="#6C5CE7"/><rect x="7.5" y="20" width="4.5" height="4.5" rx="1.8" fill="#fff"/><rect x="13.75" y="14.5" width="4.5" height="10" rx="1.8" fill="#fff"/><rect x="20" y="8.5" width="4.5" height="16" rx="1.8" fill="#fff"/></svg></span>\n            <span>Rankfixer</span>\n        </a>\n        <button class="nav-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false" aria-controls="nav-links"><span></span><span></span><span></span></button>\n        <div class="nav-links" id="nav-links">')
]);

// --- Edit 7: toggle JS before </body> ---
edits.push([
  L('</body>\n</html>'),
  L('<script>\n(function () {\n    var toggle = document.querySelector(".nav-toggle");\n    var links = document.getElementById("nav-links");\n    if (!toggle || !links) return;\n    toggle.addEventListener("click", function () {\n        var open = links.classList.toggle("open");\n        toggle.setAttribute("aria-expanded", open ? "true" : "false");\n    });\n    links.addEventListener("click", function (e) {\n        if (e.target && e.target.tagName === "A") {\n            links.classList.remove("open");\n            toggle.setAttribute("aria-expanded", "false");\n        }\n    });\n})();\n</script>\n</body>\n</html>')
]);

for (let i = 0; i < edits.length; i++) {
  const [oldStr, newStr] = edits[i];
  if (html.indexOf(oldStr) === -1) {
    throw new Error('Edit ' + (i + 1) + ' NOT FOUND. Context:\n' + oldStr.slice(0, 200));
  }
  const count = html.split(oldStr).length - 1;
  if (count !== 1) {
    throw new Error('Edit ' + (i + 1) + ' matched ' + count + ' times (expected 1)');
  }
  html = html.replace(oldStr, newStr);
}

// Write logo assets
const imagesDir = path.join(ROOT, 'site', 'images');
fs.mkdirSync(imagesDir, { recursive: true });

const mark = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="Rankfixer"><rect width="32" height="32" rx="9" fill="#6C5CE7"/><rect x="7.5" y="20" width="4.5" height="4.5" rx="1.8" fill="#ffffff"/><rect x="13.75" y="14.5" width="4.5" height="10" rx="1.8" fill="#ffffff"/><rect x="20" y="8.5" width="4.5" height="16" rx="1.8" fill="#ffffff"/></svg>';

const favicon = mark;

const logo = '<svg xmlns="http://www.w3.org/2000/svg" width="150" height="32" viewBox="0 0 150 32" role="img" aria-label="Rankfixer logo">\n' +
  '  <rect width="32" height="32" rx="9" fill="#6C5CE7"/>\n' +
  '  <rect x="7.5" y="20" width="4.5" height="4.5" rx="1.8" fill="#ffffff"/>\n' +
  '  <rect x="13.75" y="14.5" width="4.5" height="10" rx="1.8" fill="#ffffff"/>\n' +
  '  <rect x="20" y="8.5" width="4.5" height="16" rx="1.8" fill="#ffffff"/>\n' +
  '  <text x="44" y="22" font-family="Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif" font-size="20" font-weight="700" letter-spacing="-0.4" fill="#0D0D1A">Rankfixer</text>\n' +
  '</svg>\n';

fs.writeFileSync(path.join(imagesDir, 'favicon.svg'), favicon, 'utf8');
fs.writeFileSync(path.join(imagesDir, 'logo.svg'), logo, 'utf8');

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('OK: all edits applied, assets written.');
