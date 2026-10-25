# Privacy Policy — RoboGarage
Last updated: October 13, 2026 — Version 1.0

Data controller: [COMPANY NAME / FULL NAME], [ADDRESS], [VAT/TAX ID],
privacy email: [PRIVACY EMAIL], PEC: [PEC if any].
DPO (if appointed): [NAME, EMAIL]. For Enterprise self-hosted the customer
is the independent controller; we act as processor only under a signed DPA.

## 1. What we collect and why (GDPR legal basis)
- **Account**: username, email, display name, color, password hash (scrypt+salt,
  never plaintext), avatar (2MB max). Basis: contract performance (Art. 6(1)(b)).
- **Content**: repos/skills, commits, PRs, stars, collaborators, public/private
  visibility. Basis: contract. Private repos are never published.
- **Payments** (paid plans only): handled by Stripe; we only see customer ID,
  plan, last-4 digits and invoices, never full card numbers. Basis: contract
  + tax obligations (Art. 6(1)(c)).
- **Technical**: server logs (IP, user-agent, timestamps, errors), JWT kept only
  in your browser (7 days). Basis: legitimate interest in security (Art. 6(1)(f)),
  12-month retention then aggregation.
- **Password recovery**: single-use 30-minute token + email. Without configured
  SMTP the link goes only to server logs (local use).
- **Service email**: transactional only (welcome, reset, security alerts,
  invoices). Marketing only with separate consent (Art. 6(1)(a)), revocable.

No advertising profiling, no data selling.

## 2. Where data lives
Backend: [HETZNER/EU — Falkenstein, specify]. DB is SQLite today (`./data/*.db`,
git repos in `./data/repos`, avatars in `./data/avatars`); in production EU
Postgres + EU S3 with daily encrypted backups (30-day retention). No transfers
outside the EU/EEA except subprocessors under SCCs (e.g. Stripe, email provider
— see §5).

## 3. Sharing
- **Public** repos: visible to anyone + Claude marketplace (only validated
  public plugins, with real sha256).
- **Private** repos: visible only to you/collaborators; APIs return 404 to
  outsiders (never leak existence).
- Subprocessors: EU hosting, Stripe, SMTP provider. Up-to-date list on request
  at [PRIVACY EMAIL]. No data selling.

## 4. Retention
Active account: for the account lifetime + 24 months aggregated logs. On deletion:
 repos exportable for 90 days (git/archive export), then DB + git + avatar
 deletion within 30 days; invoices 10 years (tax duty); expired reset tokens
 deleted immediately. Backups: deletion within 30 days of cycle.

## 5. Your rights (GDPR Art. 15–22)
Access, rectification, erasure, restriction, portability (JSON export + git
tarball via UI/API), objection, consent withdrawal. Write to [PRIVACY EMAIL]
with your username; we reply within 30 days. Complaint to your supervisory
authority (e.g. Garante in Italy).

## 6. Security (Art. 32 measures)
scrypt + salt passwords, HS256 JWT with long rotated `JWT_SECRET`, TLS
everywhere (HSTS), encrypted backups, SSH-key + 2FA server access, login/
recover rate limits, upload validation (type/size, avatar anti-traversal),
immutable logs. Breaches notified within 72h to the authority and, if high
risk, to data subjects.

## 7. Children
Service not allowed under 16 (or 14 where parental consent is permitted).

## 8. Cookies
Technical only (JWT session, preferences, load balancer). No profiling cookies.
Banner only if you add analytics/marketing — none today.

## 9. Changes
We notify you 30 days in advance by email for material changes; continued use
= acceptance. Previous versions kept in repo.

---
FILL IN BEFORE GO-LIVE: controller identity, privacy email, hosting location,
subprocessors, DPO, exact retention times, Terms and DPA links.
