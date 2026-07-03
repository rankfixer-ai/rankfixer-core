# Campaign Email Templates — "100 SaaS AI Readiness" Launch

> **Sender:** Alex from RankFixer (alex@rankfixer.co)
> **Reply-to:** alex@rankfixer.co (monitor replies)
> **Format:** Plain-text style, HTML wrapper from `email-templates/email-templates.md`
> **UTM:** utm_source=email&utm_medium=transactional&utm_campaign=saas_readiness_launch

---

## Email 1: All Free Users — Day 1 (Launch Day)

**Segment:** All users who have run the free scan, have email captured
**Subject:** We analyzed 100 SaaS companies. Here's the data.

```
Subject: We analyzed 100 SaaS companies. Here's the data.

Hi {{first_name}},

We just finished something I think you'll find interesting.

We ran the top 100 SaaS websites through our AI Visibility engine.
The results surprised even us:

• 67% score below 40/100
• Only 3 companies score above 80 (HubSpot, Salesforce, Stripe)
• 96% don't have an llms.txt file
• 82% are missing FAQPage schema
• 39% block AI crawlers in robots.txt

The #1 fix? Unblock AI crawlers + add FAQPage schema.
5-minute job. 10-15 point improvement.

We open-sourced everything — the full dataset, the methodology,
and the analysis code. MIT license.

📊 Full breakdown: https://rankfixer.co/blog/ai-readiness-100-saas
📂 Dataset on GitHub: https://github.com/rankfixer-ai/rankfixer-core
🔬 Check your own site (free, 30 seconds): https://rankfixer.co/ai-visibility-checker

{{#if user_has_scanned}}
Your last score for {{domain}}: {{score}}/100
How do you compare? {{score_comparison_text}}
{{/if}}

- Alex

P.S. The window to establish AI visibility is closing.
Early adopters are pulling ahead by 32 points on average.
Start with the free scan — 30 seconds, no signup needed.
```

### Personalization Variables

| Variable | Source | Example |
|----------|--------|---------|
| `{{first_name}}` | Email capture | "Sarah" |
| `{{domain}}` | Last scanned domain | "acmecorp.com" |
| `{{score}}` | Last scan result | "34" |
| `{{score_comparison_text}}` | Logic: score vs 48.7 avg | "You're 14.7 points below the SaaS average. Your #1 Quick Win: unblock AI crawlers." |

---

## Email 2: High-Intent PQLs — Day 3

**Segment:** Users with PQL score 50+ OR who have scanned 3+ times OR whose score improved 10+ points
**Subject:** Your AI visibility vs. the top 100 SaaS companies

```
Subject: Your {{domain}} score vs. the top 100 SaaS companies

Hi {{first_name}},

When we analyzed 100 top SaaS websites, the average AI visibility
score was 48.7/100.

Your last scan for {{domain}}: {{score}}/100

{{#if score_above_average}}
That puts you in the top {{percentile}}% of all domains we've scanned.
You're doing something right — and there's still room to grow.
{{else}}
You're below the average — but the gap is fixable. Most domains
improve 10-15 points with a single 5-minute fix.
{{/if}}

Here's how you compare to the top 5:

HubSpot:     91.2
Salesforce:  88.7
Stripe:      86.4
Shopify:     82.1
Zapier:      79.8
{{domain}}:    {{score}}  ← you

{{#if score_below_60}}
Your #1 Quick Win: {{quick_win_title}}
Time: ~{{fix_time}}
Expected improvement: +{{expected_delta}} points

Re-scan after fixing: https://rankfixer.co/ai-visibility-checker
{{/if}}

Read the full analysis: https://rankfixer.co/blog/ai-readiness-100-saas
See the dataset: https://github.com/rankfixer-ai/rankfixer-core

- Alex
```

---

## Email 3: Follow-Up — Day 7

**Segment:** All users from Email 1 who opened but didn't re-scan
**Subject:** How to fix your AI visibility in 5 minutes

```
Subject: How to fix your AI visibility in 5 minutes

Hi {{first_name}},

Last week, I shared our analysis of 100 SaaS companies' AI readiness.

The #1 finding: most of the fixes are fast.

Here are the 3 Quick Wins that take under an hour combined:

1. UNBLOCK AI CRAWLERS (5 minutes)
   Edit your robots.txt file. Add:
   User-agent: GPTBot
   Allow: /
   User-agent: ClaudeBot
   Allow: /
   User-agent: PerplexityBot
   Allow: /

   That's it. Most domains gain 10-15 points from this alone.

2. ADD FAQPAGE SCHEMA (15 minutes)
   Add JSON-LD FAQ schema to your top 5 pages. Template:
   https://github.com/rankfixer-ai/rankfixer-core#readme

   82% of SaaS sites are missing this. It's the highest-impact
   schema type for AI citation.

3. CREATE llms.txt (5 minutes)
   Add an llms.txt file at yourdomain.com/llms.txt
   Template: https://github.com/rankfixer-ai/rankfixer-core/blob/main/llms.txt

   96% of top SaaS companies don't have one. You'll be ahead of
   almost everyone with a 5-minute file.

Total time: under 30 minutes.
Expected score improvement: 15-25 points.

Run a free scan before and after to measure your improvement:
https://rankfixer.co/ai-visibility-checker

- Alex

P.S. We're tracking scores weekly. Every domain that implements
these 3 fixes sees measurable improvement within 14 days.
```

---

## Email 4: Social Proof — Day 14 (optional, for engaged users)

**Segment:** Users who re-scanned and improved OR who clicked blog CTA
**Subject:** This founder went from 8 to 72 in 3 months

```
Subject: This founder went from 8 to 72 in 3 months

Hi {{first_name}},

I wanted to share something we've been tracking.

We analyzed the data from our free checker — specifically, domains
that improved the most over 90 days.

The pattern is consistent:

Scan 1 (Day 1):   Low score. Quick Win identified.
Scan 2 (Day 7):    +10-15 points. Fix worked.
Scan 3 (Day 14):   +5-10 more. Second fix.
Scan 4 (Day 90):   +20-30 more. Compounding effect.

One founder we've been tracking:

Day 1:   8/100  (AI crawlers blocked)
Day 7:  22/100  (Crawlers unblocked)
Day 14: 41/100  (Structured data added)
Day 90: 72/100  (Full AI visibility)

From invisible to top-3 mentioned brand in their category on ChatGPT.
Same product. Same website. Better AI structure.

Your current score: {{score}}/100
Your next Quick Win: {{quick_win_title}}
Time: ~{{fix_time}}

Re-scan: https://rankfixer.co/ai-visibility-checker

- Alex
```

---

## Email Segmentation Logic

```python
def get_campaign_segment(user):
    """
    Segment users for the campaign email sequence.
    """
    if not user.email_captured:
        return None  # Don't email users who haven't opted in
    
    # Segment 1: All free users with email (Email 1)
    if user.scans_count >= 1:
        segment = 'all_free_users'
    
    # Segment 2: High-intent PQLs (Email 2)
    if user.pql_score >= 50 or user.scans_count >= 3 or user.score_delta >= 10:
        segment = 'high_intent'
    
    # Segment 3: Opened but no re-scan (Email 3)
    if user.opened_email_1 and not user.re_scanned_after_email:
        segment = 'opened_no_action'
    
    return segment
```

---

## UTM Parameters (Per Email)

| Email | utm_content |
|-------|------------|
| Email 1 (All Users) | `email1_all_users` |
| Email 2 (PQLs) | `email2_pql` |
| Email 3 (Follow-up) | `email3_quick_wins` |
| Email 4 (Social Proof) | `email4_social_proof` |

All share: `utm_source=email&utm_medium=transactional&utm_campaign=saas_readiness_launch`
