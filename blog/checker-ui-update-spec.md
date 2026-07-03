# Free Checker UI Updates — Campaign Launch

> **Purpose:** Surface the research blog post to free checker users at the moment of highest engagement (post-scan results).

---

## Update 1: Header Navigation — Add "Blog / Research" Link

### Current State
```
[RankFixer Logo]                    [Free AI Visibility Checker]
```

### Target State
```
[RankFixer Logo]     [Checker] [Blog ▾] [GitHub ★]     [⭐ Star us]
```

### Implementation

Add to `<header>` or `<nav>` in the checker page:

```html
<nav class="site-nav">
  <a href="/ai-visibility-checker" class="nav-link">Checker</a>
  <div class="nav-dropdown">
    <a href="/blog" class="nav-link">Blog ▾</a>
    <div class="dropdown-content">
      <a href="/blog/ai-readiness-100-saas">📊 AI Readiness of 100 SaaS — NEW</a>
      <a href="/blog/why-did-my-rankings-drop-2026">📉 Why Rankings Drop (2026)</a>
      <a href="/blog/why-chatgpt-mentions-competitors">🤖 ChatGPT Mentions Competitors?</a>
      <a href="/blog/recover-lost-rankings-14-days">📅 14-Day Recovery Playbook</a>
      <a href="/blog/state-of-ai-visibility-2026">📈 State of AI Visibility 2026</a>
    </div>
  </div>
  <a href="https://github.com/rankfixer-ai/rankfixer-core" class="nav-link nav-github" target="_blank" rel="noopener">
    ⭐ Star on GitHub
  </a>
</nav>
```

### CSS (minimal, dark theme)

```css
.nav-github {
  background: rgba(108, 92, 231, 0.15);
  border-radius: 6px;
  padding: 0.4rem 0.8rem !important;
  font-weight: 600;
  transition: background 0.2s;
}
.nav-github:hover {
  background: rgba(108, 92, 231, 0.3);
}
.dropdown-content {
  display: none;
  position: absolute;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  min-width: 320px;
  z-index: 100;
  padding: 0.5rem 0;
}
.nav-dropdown:hover .dropdown-content { display: block; }
.dropdown-content a {
  display: block;
  padding: 0.5rem 1rem;
  color: var(--text);
  font-size: 0.85rem;
  text-decoration: none;
}
.dropdown-content a:hover {
  background: rgba(255,255,255,0.05);
}
```

---

## Update 2: Post-Results Banner — "See How You Compare"

### Location
After the results screen renders (below the score circle, above the accordion).

### What it looks like

```
┌──────────────────────────────────────────────────────┐
│  📊 NEW RESEARCH                                       │
│                                                       │
│  We analyzed 100 top SaaS websites for AI visibility.  │
│  See how your score compares to HubSpot (91.2),        │
│  Salesforce (88.7), and Stripe (86.4).                │
│                                                       │
│  [ SEE THE FULL REPORT → ]    [ ✕ ]                   │
└──────────────────────────────────────────────────────┘
```

### Implementation

```html
<div id="research-banner" class="research-banner" style="display:none;">
  <div class="research-banner-content">
    <span class="research-badge">📊 NEW RESEARCH</span>
    <p class="research-text">
      We analyzed <strong>100 top SaaS websites</strong> for AI visibility.
      See how your score compares to HubSpot (91.2), Salesforce (88.7), and Stripe (86.4).
    </p>
    <a href="/blog/ai-readiness-100-saas" class="research-cta">SEE THE FULL REPORT →</a>
  </div>
  <button class="research-dismiss" onclick="document.getElementById('research-banner').style.display='none'" aria-label="Dismiss">✕</button>
</div>
```

### CSS

```css
.research-banner {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, rgba(108, 92, 231, 0.12), rgba(162, 155, 254, 0.08));
  border: 1px solid rgba(108, 92, 231, 0.3);
  border-radius: var(--radius);
  padding: 1rem 1.2rem;
  margin: 1.5rem auto;
  max-width: 560px;
  gap: 1rem;
}
.research-banner-content {
  flex: 1;
}
.research-badge {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--brand);
  margin-bottom: 0.3rem;
  display: block;
}
.research-text {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}
.research-cta {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--brand);
  text-decoration: none;
}
.research-cta:hover {
  text-decoration: underline;
}
.research-dismiss {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.25rem;
  flex-shrink: 0;
}
.research-dismiss:hover {
  color: var(--text);
}
```

### JS — Show after results load

```javascript
// Inside renderResults() function, after results are displayed:
setTimeout(function() {
  document.getElementById('research-banner').style.display = 'flex';
}, 2000); // Show 2 seconds after results appear — not immediately
```

### Dismiss Behavior
- Clicking ✕ dismisses for this session (localStorage flag)
- Banner resets on next session (cookie-based or localStorage expiry after 7 days)
- If user clicks the CTA, set `sessionStorage.setItem('research_banner_clicked', '1')` so it doesn't re-show

---

## Update 3: "Cite This Data" Footer

### Location
Bottom of the checker page, above the main footer, below the FAQ.

### What it looks like

```
┌──────────────────────────────────────────────────────┐
│  📚 Cite Our Research                                  │
│                                                       │
│  If you reference our AI visibility data, please cite: │
│                                                       │
│  RankFixer. (2026). Top 100 SaaS LLM Readiness         │
│  Scores. Retrieved from https://github.com/            │
│  rankfixer-ai/rankfixer-core                           │
│                                                       │
│  [ 📋 COPY CITATION ]                                  │
└──────────────────────────────────────────────────────┘
```

### Implementation

```html
<section class="cite-section">
  <h4>📚 Cite Our Research</h4>
  <p>If you reference our AI visibility data in your work, please cite:</p>
  <blockquote class="cite-block">
    RankFixer. (2026). <em>Top 100 SaaS LLM Readiness Scores.</em>
    Retrieved from <a href="https://github.com/rankfixer-ai/rankfixer-core">https://github.com/rankfixer-ai/rankfixer-core</a>
  </blockquote>
  <button class="cite-copy-btn" onclick="navigator.clipboard.writeText('RankFixer. (2026). Top 100 SaaS LLM Readiness Scores. Retrieved from https://github.com/rankfixer-ai/rankfixer-core')">
    📋 COPY CITATION
  </button>
</section>
```

### CSS

```css
.cite-section {
  max-width: 560px;
  margin: 2rem auto;
  padding: 1.5rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  text-align: center;
}
.cite-section h4 {
  font-size: 1rem;
  margin-bottom: 0.5rem;
}
.cite-section p {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
}
.cite-block {
  background: var(--bg-input);
  border-left: 3px solid var(--brand);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  padding: 0.75rem 1rem;
  margin: 0 0 0.75rem 0;
  text-align: left;
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.5;
}
.cite-block a {
  color: var(--brand);
  word-break: break-all;
}
.cite-copy-btn {
  background: var(--bg-input);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: var(--radius-sm);
  padding: 0.5rem 1rem;
  font-family: var(--font);
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.2s;
}
.cite-copy-btn:hover {
  background: var(--border);
}
```

---

## Update 4: Homepage "Open Source" Badge

### Location
Trust bar on the checker hero section.

### Add to trust bar items:
```html
<span><span class="icon">⭐</span> Open Source (MIT)</span>
```

### Link behavior:
Clicking the badge/section navigates to `https://github.com/rankfixer-ai/rankfixer-core`

---

## Update 5: GitHub Star Badge

### Location
Fixed position, bottom-right corner of the checker page (mobile: bottom-center).

### Implementation

```html
<a href="https://github.com/rankfixer-ai/rankfixer-core" 
   class="github-corner" 
   target="_blank" 
   rel="noopener"
   aria-label="Star RankFixer on GitHub">
  <span class="github-star">⭐</span>
  <span class="github-text">Star us on GitHub</span>
  <span class="github-count" id="github-star-count">0</span>
</a>
```

### CSS

```css
.github-corner {
  position: fixed;
  bottom: 20px;
  right: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 100px;
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: var(--text);
  font-size: 0.8rem;
  font-weight: 600;
  z-index: 50;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  transition: transform 0.2s, box-shadow 0.2s;
}
.github-corner:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(108, 92, 231, 0.3);
  border-color: var(--brand);
}
.github-star { font-size: 1rem; }
.github-count {
  background: var(--brand);
  color: #fff;
  border-radius: 100px;
  padding: 0.15rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
}
@media (max-width: 600px) {
  .github-corner {
    bottom: 10px;
    right: 10px;
    padding: 0.4rem 0.75rem;
    font-size: 0.7rem;
  }
  .github-text { display: none; }
}
```

### JS — Fetch live star count

```javascript
// Fetch GitHub star count on page load
fetch('https://api.github.com/repos/rankfixer-ai/rankfixer-core')
  .then(r => r.json())
  .then(data => {
    document.getElementById('github-star-count').textContent = 
      data.stargazers_count || 0;
  })
  .catch(() => {
    // Fallback: hide count on error
    document.getElementById('github-star-count').style.display = 'none';
  });
```
