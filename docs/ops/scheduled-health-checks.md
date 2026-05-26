# Scheduled health checks — proposal

**Status:** proposal — not yet implemented (as of 2026-05-26).
**Goal:** automate the routine "is everything OK?" work so Claude does the legwork
and only escalates when a human decision is needed.

## Principle

Claude does **not** monitor systems 24/7. Real-time alerting is an external service's
job (Better Stack / Healthchecks.io / similar). Claude does the **scheduled, deeper
checks** that run on a slower cadence and produce reports for a human to act on.

## The three rings

### Ring 1 — external uptime alerting (24/7, not Claude)

External service hits a public health endpoint every minute. If it fails:

- SMS or push to Victor's phone
- Backup contact (TBD) after 10 minutes of unack

Endpoints to monitor:
- `https://auth.lab21.nl/healthz` — Zitadel
- `https://lab21-operations.vercel.app/api/status` — LAB21 Operations
- `https://chat.lab21.nl/health` — Rocket.Chat (when installed)
- Each portal's root URL

This ring exists because Claude is not invoked between sessions. **Cost: ~€15-20/mo.**

### Ring 2 — scheduled Claude routines (daily / weekly / monthly)

Claude is triggered on a schedule via Vercel cron (for checks that run on-server) or
via `/schedule` routines (for checks that need full Claude reasoning).

Each routine produces a short report. Reports go to a single inbox the human reviews:

- A dedicated Slack channel `#lab21-ops` (preferred), or
- A `docs/ops/log/YYYY-MM.md` file Claude writes to, or
- An email digest sent once a day.

**TBD: pick one destination before turning routines on.**

### Ring 3 — on-demand investigation (human-triggered)

Human opens Claude Code, says "check why auth was slow last night", Claude pulls
logs, dashboards, recent deployments, and reasons about it. No schedule.

## The routines (Ring 2)

### Daily — 03:00

#### Backup verification
- Confirm Zitadel Postgres dump from the last night exists.
- Confirm size is within ±20% of yesterday's (catches truncated dumps).
- Confirm the offsite copy uploaded successfully.
- Alert if any check fails.

#### Disk + memory snapshot
- SSH to Leaseweb host, capture `df -h` and `free -m`.
- Compare against last week's snapshot.
- Alert if disk > 80% or RAM headroom < 20%.

### Weekly — Monday 09:00

#### Zitadel update check
- Check GitHub releases for new versions since last week.
- Read release notes; classify as patch / minor / major.
- For patch + minor: post a one-line "ready to apply, no breaking changes" note.
- For major: post a summary with migration concerns and wait for human approval
  before scheduling the upgrade.

#### CVE scan
- Run `trivy` (or equivalent) against Zitadel + Caddy + Postgres images.
- Report any CRITICAL or HIGH CVEs.
- Cross-check against existing version → upgrade path.

#### Cert expiry check
- Probe `auth.lab21.nl` cert; alert if < 14 days remaining (Caddy should auto-renew,
  but verify).

#### Login-failure trend
- Pull last 7 days of failed login events from Zitadel.
- Flag unusual spikes (per IP, per user, per hour-of-day).
- Useful for catching credential-stuffing attempts early.

### Monthly — first Monday 09:00

#### Backup-restore drill
- Spin up a throwaway Postgres + Zitadel container.
- Restore yesterday's backup into it.
- Verify Zitadel starts and admin user exists.
- Tear down.
- Post pass/fail report.

#### User-account audit
- List active Zitadel users.
- Cross-check against current employees table + active aannemers/klanten.
- Flag accounts that haven't logged in for > 90 days for review.
- Flag service accounts and confirm they're still needed.

#### Decision-log review (orchestrator)
- Sample 20 recent decision-log entries from LAB21 Operations.
- Confirm each has a corresponding tijdlijn entry in Zoho.
- Catches drift between orchestrator decisions and Zoho state.

## Implementation plan

1. **Pick a report destination first.** Slack channel is easiest. Without this, the
   reports go nowhere and become noise.
2. **Implement Ring 1 (external alerting).** This is the safety net. Without it, Claude's
   routines are a "nice to have" but you have no 24/7 coverage.
3. **Add the daily backup verification routine.** This is the highest-value check —
   silent backup failures are the most common cause of permanent data loss.
4. **Add the weekly Zitadel update check.** Catches CVEs early.
5. **Add the monthly restore drill.** This is the one check most teams skip and most
   teams regret skipping. Once Claude runs it monthly, it's no longer a chore.
6. **Iterate.** Add routines as patterns emerge from real incidents.

## Cost estimate

| Item                                 | €/month |
| ------------------------------------ | ------- |
| External alerting (Better Stack etc.) | 15-20   |
| Backup storage (Backblaze B2 or sim.) | 5-10    |
| SMTP for auth + alerts (Postmark)     | 10-15   |
| **Subtotal**                          | **30-45** |

Compared to ~€100-500/mo for Clerk-style managed identity, the savings cover the
external alerting comfortably while keeping the data on-prem.

## Open questions before turn-on

- Where do scheduled reports land? (Slack / email / file / Discord?)
- Who is the backup human if Victor is unavailable?
- AVG retention for login logs — how long do we keep failed-login records?
- Do we want Claude to attempt auto-remediation for known incidents (e.g. restart
  container if it's crashed), or always wait for human approval?
