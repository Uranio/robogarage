# RoboGarage — Recommended business model

## Why it can work
RoboGarage is "GitHub for AI skills" with a validator, one-click install
(Claude / OpenCode / Codex / Cursor / Gemini) and a marketplace. Value:
time saved (no prompt/tool rewriting), quality (validator + evals),
distribution (marketplace + archive). Target: AI developers, agencies,
and enterprise teams standardizing agents.

## Recommended model: Freemium SaaS + marketplace commission

### Plans (suggested starting prices, EUR excl. VAT)
- **Free — €0**: 3 public repos, 1 private, 100 installs/month, basic
  validator, community support. Goal: acquisition + SEO (public repos indexed).
- **Pro — €12/month (€120/year)**: unlimited private repos, sell on the
  marketplace, full validator + evals, 5,000 installs/month, stats,
  priority support, custom `PUBLIC_URL` for archives.
- **Team — €39/user/month (min 3)**: orgs, roles (owner/contributor),
  shared repos, audit log, Google/GitHub SSO, 99.5% SLA, DPA included.
- **Enterprise self-hosted — from €5,000/year**: OEM license, Docker in the
  customer VPC, Postgres + S3, backups, dedicated support. This is the margin.

### Marketplace (second leg)
- Premium skills/plugins, one-time or per-skill subscription (e.g. €9–49).
  Platform fee **20%** (15% above €1,000/month per seller, to retain them).
- Verified "Validated" badge (zero-error validator) featured on top.
- Monthly payouts via Stripe Connect, €50 threshold.

### What NOT to do at first
- No lifetime deals: they kill MRR.
- No overly generous free private/CI quotas: git + storage costs grow.
- No ads: destroys dev trust.

## Metrics to watch
MRR, logo/revenue churn, activation (first skill published < 7 days),
installs/repo/month, % repos validating with zero errors, marketplace
take rate, CAC payback < 6 months.

## 90-day go-to-market
1. Launch free + 20 high-quality seed skills (web-scraper, code-reviewer…).
2. Docs + `robogarage install owner/name` as the hero command.
3. One-click integration for Claude/OpenCode (already ready via marketplace.json).
4. Content: "before/after validator" comparisons, public evals.
5. Design partners: 5 agencies on free Team for 3 months for logo/case study.

## Risks and mitigations
- Abuse (scraping, malware in skills) → validator + sandbox + report + ToS.
- Git storage costs → per-plan limits + prune + LFS/S3 from day 1 for enterprise.
- Perceived lock-in → git/archive export always free (also a GDPR argument).

## Minimum payments/compliance stack
Stripe (subscriptions + Connect), e-invoicing via Stripe Tax or accountant,
standard DPA for Team/Enterprise, art. 30 GDPR processing records,
90-day retention after deletion.
