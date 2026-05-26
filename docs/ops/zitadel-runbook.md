# Zitadel runbook (self-hosted on Leaseweb)

**Status:** planned — not yet installed (as of 2026-05-26).
**Owner:** Victor (XCX International).
**Executor for routine work:** Claude Code.

## Purpose

Zitadel is the central identity provider for the LAB21 ecosystem. Every portal
(klantenportal, aannemersportal, aannemer management), the chat service (Rocket.Chat),
and LAB21 Operations itself authenticate users via Zitadel's OIDC tokens.

Identity is **not** in Zoho. Klant + Aannemer contacts exist in Zoho as business records,
but their login credentials live in Zitadel. A separate `chat_user_mapping` table in the
Leaseweb mirror DB links Zitadel user IDs to the relevant Zoho record IDs.

## Topology

```
                ┌──────────────────────┐
                │  Zitadel container   │
                │  + dedicated Postgres│
                │  + Caddy (TLS)       │
                └──────────────────────┘
                  Leaseweb VM
                  auth.lab21.nl (TBD)
```

- **Host:** Leaseweb VM, separate from the mirror-DB host.
- **DB:** Zitadel's own Postgres instance — **not shared** with the mirror cluster.
  Auth data isolated for security and backup reasons.
- **Reverse proxy:** Caddy for automatic Let's Encrypt TLS.
- **DNS:** `auth.lab21.nl` (placeholder — final hostname TBD).
- **Email:** outbound SMTP via Postmark (or alternative) for password reset, verification,
  MFA backup codes.

## Installation (first-time, planned)

> Not yet executed. This section is a forward-looking checklist; revise to a real
> step-by-step the day we provision.

1. Provision Leaseweb VM (2 vCPU / 2 GB RAM minimum for Zitadel + Postgres on one box).
2. Install Docker + docker-compose.
3. Set up Caddy with automatic TLS for `auth.lab21.nl`.
4. Deploy Zitadel via official docker-compose; configure Postgres credentials.
5. Configure SMTP for transactional email.
6. Create the first admin account; enforce MFA on it.
7. Create OIDC applications for each consumer:
   - Klantenportal
   - Aannemersportal
   - Aannemer management portal
   - Rocket.Chat
   - LAB21 Operations (this app)
8. Save client IDs and secrets in each consumer's environment (Vercel env-vars for
   Vercel-hosted apps; per-service env files for self-hosted ones).
9. Set up backup cron (see below).
10. Set up monitoring hook (see [scheduled-health-checks.md](./scheduled-health-checks.md)).

## Routine maintenance

### Patching (monthly)

1. Subscribe to Zitadel release notes (GitHub releases for `zitadel/zitadel`).
2. Once a month, Claude runs the upgrade check (see scheduled health checks).
3. For a non-breaking minor/patch release:
   - Take a fresh DB backup.
   - Bump the image tag in `docker-compose.yml`.
   - `docker compose pull && docker compose up -d`.
   - Verify login flow on a test account.
4. For a major release: read the migration notes before bumping; Claude posts a summary
   for human approval before executing.

### Backups (daily)

- `pg_dump` of Zitadel's Postgres → encrypted archive → offsite storage (Vercel Blob,
  Backblaze B2, or Leaseweb's own backup service — TBD).
- Retention: 30 days daily, 12 months monthly.
- Once a month, Claude runs the restore-verification procedure: spin up a throwaway
  container, restore the latest backup, confirm Zitadel starts and the admin user
  exists.

### Cert renewal

- Caddy handles Let's Encrypt automatically. No manual action expected.
- Health check verifies the cert has > 14 days remaining; alerts if shorter.

## Incident procedures

### Auth is down (no one can log in)

1. Confirm scope: is `auth.lab21.nl` unreachable, or are tokens invalid?
2. SSH to the Leaseweb host: `docker compose ps` to check container status.
3. Check Zitadel logs: `docker compose logs -n 200 zitadel`.
4. Check Postgres reachability from the Zitadel container.
5. Check disk: `df -h` — Postgres logs or backups may have filled the disk.
6. Check Caddy: `docker compose logs caddy` — TLS issues are common after cert renewal.
7. If unclear within 15 minutes: roll back to last known-good image tag.
8. After resolution: post a short incident note in `docs/ops/incidents/YYYY-MM-DD-slug.md`.

### Suspected compromise

1. **Do not** delete logs.
2. Disable all OIDC apps via admin UI (forces every portal to drop sessions).
3. Rotate Postgres password and signing keys.
4. Force-revoke all active sessions.
5. Snapshot the VM for forensics before any rebuild.
6. Notify Victor + start AVG breach-clock if user data was accessed.

### Forgotten admin password

1. Use Zitadel's CLI to reset via the database directly — procedure documented at
   <https://zitadel.com/docs> (link to be replaced with the exact ref when installed).
2. After reset: re-enforce MFA, audit recent admin actions.

## Contract with Claude Code

When invoked for ops on Zitadel, Claude:

1. **Reads this runbook in full** before acting.
2. **Confirms scope** with the human before any destructive command (backup-restore,
   image rollback, password reset, anything touching the DB directly).
3. **Records** every non-trivial action in `docs/ops/log/YYYY-MM.md` so future sessions
   know what happened.
4. **Does not** assume continuity between sessions — re-reads logs, re-checks current
   state, re-confirms with the human.
5. **Escalates** by stopping and asking if the situation is unfamiliar or if the
   runbook does not cover it.

## Open items

- Decide final hostname (`auth.lab21.nl` vs `id.lab21.nl` vs other).
- Decide SMTP provider for transactional mail.
- Decide backup storage destination.
- Decide alerting destination (Better Stack? Healthchecks.io? Both?).
- First OIDC integration as proof — likely klantenportal as smallest blast radius.
