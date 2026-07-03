# RPES Governance Framework (Hermes v1)

## Research (R)
- Verify template classification confidence before action. If < 70%, flag for human review.

## Performance (P)
- Limit crawls to sample sets. Throttle if server load > 80%.

## Economic (E)
- Prioritize Critical issues on `checkout`, `product`, `cart` templates.

## Structural (S)
- Favor internal linking improvements over meta-tag changes.

## Contradiction Scoring
```
RPES_Score = (R_weight × 0.15) + (P_weight × 0.15) + (E_weight × 0.50) + (S_weight × 0.20)
```
- ≥ 80: Autonomous fix | 50-79: Recommend | 25-49: Monitor | < 25: Log only

## Autonomous Fix Gating
1. Confidence ≥ 70%
2. Affects template, not individual page (unless cart/checkout)
3. Estimated affected pages ≥ 5
4. Fix is reversible
5. No conflict with other detected issues

## Template-Type Priority Override
checkout/cart → E=100 | product → E=90 | category → S=80 | homepage → S=90

| Severity | Action |
|----------|--------|
| Critical | Autonomous fix (if low risk) |
| High | Propose to dashboard |
| Medium | Queue for maintenance |
| Low | Log as insight |
