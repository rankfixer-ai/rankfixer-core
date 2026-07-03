# Chart Specs — "100 SaaS AI Readiness" Blog Post + Social

> Give these specs to a designer or generate with Chart.js/D3. All data from `data/top_100_saas_scores.json`.

---

## Chart 1: Score Distribution Histogram (Social Hero + Blog)

**Use:** Blog post hero image, LinkedIn carousel slide 2, Twitter thread tweet 2

**Type:** Horizontal bar chart

**Data:**
```
Excellent (81-100):  3 sites  ███
Good (61-80):        8 sites  ████████
Fair (41-60):       22 sites  ██████████████████████
Poor (21-40):       31 sites  ███████████████████████████████
Critical (0-20):    36 sites  ████████████████████████████████████
```

**Design:**
- Dark background (#0D0D1A)
- Bars color-coded by tier (Critical=#E17055, Poor=#FDCB6E, Fair=#74B9FF, Good=#00B894, Excellent=#A29BFE)
- White labels
- Title: "AI Visibility Scores — 100 SaaS Companies"
- Subtitle: "67% score below 40/100"
- Size: 1200x630 (blog OG), 800x400 (inline)

**Alt text:** "Bar chart showing distribution of AI visibility scores across 100 SaaS companies. 36 score Critical (0-20), 31 Poor (21-40), 22 Fair (41-60), 8 Good (61-80), and 3 Excellent (81-100)."

---

## Chart 2: Top 10 Leaderboard (LinkedIn carousel slide 4, blog post)

**Type:** Horizontal bar chart (ranked)

**Data:**
```
 1. hubspot.com      91.2  ██████████████████████████████████████████████
 2. salesforce.com   88.7  ████████████████████████████████████████████
 3. stripe.com       86.4  ███████████████████████████████████████████
 4. shopify.com      82.1  ████████████████████████████████████████
 5. zapier.com       79.8  ███████████████████████████████████████
 6. notion.so        78.3  ██████████████████████████████████████
 7. atlassian.com    77.5  █████████████████████████████████████
 8. slack.com        76.9  █████████████████████████████████████
 9. dropbox.com      74.2  ███████████████████████████████████
10. mailchimp.com    72.8  ██████████████████████████████████
```

**Design:**
- Dark background
- Domain names left-aligned, scores right-aligned
- Bars in brand purple (#6C5CE7)
- Title: "Top 10 SaaS Companies by AI Visibility"
- Size: 800x500

---

## Chart 3: Signal Importance (LinkedIn carousel slide 6, blog post)

**Type:** Horizontal bar chart

**Data (correlation with overall score):**
```
Schema Completeness     25%  ██████████████████████████████████████████████████
Entity Density          20%  ████████████████████████████████████████
Content Answer Density  20%  ████████████████████████████████████████
Technical Signals       15%  ██████████████████████████
Backlink Quality        10%  ████████████████████
Brand Entity Recognition 5%  ██████████
Freshness                5%  ██████████
```

**Design:**
- Dark background
- Weight percentages as labels
- Bars in gradient purple (#6C5CE7 → #A29BFE)
- Title: "What Makes an LLM Cite You? (7 Signals, Weighted)"
- Size: 800x500

---

## Chart 4: Category Breakdown (Blog post, LinkedIn carousel slide 8)

**Type:** Horizontal bar chart

**Data:**
```
CRM                      63.4  ██████████████████████████████████████████████████████████████
Marketing Automation     58.2  ██████████████████████████████████████████████████████████
Project Management       52.7  ██████████████████████████████████████████████████████
Collaboration            51.2  █████████████████████████████████████████████████████
E-commerce               48.1  ████████████████████████████████████████████████
Analytics                46.3  ██████████████████████████████████████████████
Customer Support         45.6  █████████████████████████████████████████████
Developer Tools          44.8  ████████████████████████████████████████████
Finance & Accounting     42.1  ██████████████████████████████████████████
HR & Recruiting          39.5  ███████████████████████████████████████
Security                 38.9  ██████████████████████████████████████
```

**Design:**
- Dark background
- Category names left, average dotted line at 48.7
- Bars: green above average (#00B894), red below (#E17055)
- Title: "AI Visibility by SaaS Category"
- Subtitle: "CRM leads. Security lags. Average: 48.7/100"
- Size: 800x500

---

## Chart 5: Citation Rate by Score Range (LinkedIn carousel slide 9)

**Type:** Bar chart with trend line

**Data:**
```
Score Range      Relative Citation Rate
81-100           4.2x
61-80            1.9x
41-60            1.0x (baseline)
21-40            0.4x
0-20             0.1x
```

**Design:**
- Dark background
- Bars color-coded by tier
- Annotated: "Sites scoring 81+ are cited 4.2x more"
- Title: "Citations Increase Dramatically Above 80"
- Size: 800x400

---

## Chart 6: Quick Win Impact (Blog post)

**Type:** Before/After comparison chart

**Data:**
```
Current avg:    48.7  ████████████████████████████████████████████████
After 1 fix:    56.8  ██████████████████████████████████████████████████████████
After 3 fixes:  68.2  ██████████████████████████████████████████████████████████████████████
After all:      78.4  ██████████████████████████████████████████████████████████████████████████████
```

**Design:**
- Dark background
- Arrow between each bar showing +8.1, +11.4, +10.2
- Title: "Impact of Fixing Your Top Issues (Simulated)"
- Size: 800x400

---

## Chart 7: Schema Adoption Gap (Twitter/X standalone image)

**Type:** Comparison bars

**Data:**
```
Organization schema:        32% have it  ████████████████████  68% missing
FAQPage schema:             11% have it  ███████               89% missing
llms.txt file:               4% have it  ██                    96% missing
AI crawlers unblocked:      61% allowed  ██████████████████████████████████████  39% blocked
```

**Design:**
- Dark background
- "Have it" in green (#00B894), "Missing" in red (#E17055)
- Title: "The Schema Gap: What 100 SaaS Companies Have vs. What They Need"
- Size: 1200x675 (Twitter card)

---

## Color Palette (Consistent Across All Charts)

| Color | Hex | Use |
|-------|-----|-----|
| Brand Purple | #6C5CE7 | Primary bars, CTAs |
| Brand Light | #A29BFE | Gradients, secondary |
| Critical Red | #E17055 | Tier 5, negative |
| Warning Yellow | #FDCB6E | Tier 4, caution |
| Info Blue | #74B9FF | Tier 3, neutral |
| Success Green | #00B894 | Tier 2, positive |
| Excellent Purple | #A29BFE | Tier 1, top tier |
| Background | #0D0D1A | Chart background |
| Card BG | #151528 | Card backgrounds |
| Text | #F0F0F5 | Labels, titles |
| Muted | #8888A0 | Subtitles, axes |

---

## Image Generation Spec (for AI image generators)

```
Prompt: "Dark-themed data dashboard with horizontal bar charts showing AI visibility scores for SaaS companies. Deep navy background (#0D0D1A), purple accent bars (#6C5CE7), clean minimalist design, white labels, professional data visualization style, no text clutter."
```

---

## Quick Chart.js Implementation (for blog post — no designer needed)

```html
<canvas id="scoreDistribution" width="800" height="400"></canvas>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
new Chart(document.getElementById('scoreDistribution'), {
  type: 'bar',
  data: {
    labels: ['Critical\n(0-20)', 'Poor\n(21-40)', 'Fair\n(41-60)', 'Good\n(61-80)', 'Excellent\n(81-100)'],
    datasets: [{
      data: [36, 31, 22, 8, 3],
      backgroundColor: ['#E17055', '#FDCB6E', '#74B9FF', '#00B894', '#A29BFE'],
      borderRadius: 4
    }]
  },
  options: {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'AI Visibility Scores — 100 SaaS Companies',
        color: '#F0F0F5',
        font: { size: 16, weight: 'bold' }
      },
      subtitle: {
        display: true,
        text: '67% score below 40/100',
        color: '#8888A0',
        font: { size: 12 }
      }
    },
    scales: {
      x: { 
        grid: { color: '#2A2A45' },
        ticks: { color: '#8888A0' }
      },
      y: { 
        grid: { display: false },
        ticks: { color: '#F0F0F5' }
      }
    }
  }
});
</script>
```

---

## Delivery Format

For social media: PNG, 2x resolution (2400x1260 for OG images)
For blog post: SVG (scalable) or PNG at 2x
For email: PNG at 1x (600px wide max)
