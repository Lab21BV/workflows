# LAB21 Operations — Ops runbooks

Operational documentation for self-hosted infrastructure that supports the LAB21 ecosystem.
Each runbook captures: what the system does, how to install it, routine maintenance,
incident procedures, and the contract with Claude Code for automated execution.

These docs are the source of truth for ops procedures. Claude reads them at the start of
any ops session and follows them step by step — keep them current.

## Index

| Service                  | Status      | Runbook                                          |
| ------------------------ | ----------- | ------------------------------------------------ |
| Zitadel (identity)       | Planned     | [zitadel-runbook.md](./zitadel-runbook.md)       |
| Scheduled health checks  | Planned     | [scheduled-health-checks.md](./scheduled-health-checks.md) |
| Leaseweb mirror Postgres | To be built | _runbook follows once mirror lands_              |
| Rocket.Chat              | To be built | _runbook follows once chat lands_                |

## Ownership model

- **Accountable owner:** Victor (XCX International) — name on incidents, decisions, AVG.
- **Executor for routine work:** Claude Code, invoked on demand or via `/schedule`.
- **24/7 alerting:** external service (Better Stack or Healthchecks.io) — paging humans
  when something breaks; Claude is not a 24/7 presence.

The pattern is always the same: alerting notices a problem → human gets paged → human
opens a Claude Code session and references the relevant runbook → Claude executes.

## Conventions

- Each runbook starts with **Purpose**, **Topology**, **Routine maintenance**, and
  **Incident procedures**.
- Commands are copy-pasteable; placeholders use `<UPPER_SNAKE>` form.
- Every destructive command is annotated with a confirmation step.
- Versions and dates are explicit — assume Claude has no memory between sessions.
