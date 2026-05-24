# VI-Reschedule Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the voorinspectie reschedule chain inside LAB21 Operations — a stateless decision tree triggered by Zoho webhooks that validates buffer rules, handles two branches (new VI date vs. new leverdatum), commits outcomes to Zoho, and notifies the right internal department via a todo list.

**Architecture:** Stateless re-evaluation. Zoho is the source of truth; the orchestrator reads current Voorinspectie state on each webhook, runs a pure decision function, and writes outcomes back to Zoho. All Zoho access lives behind `src/repo/*` thin wrappers so a future Postgres swap is bounded. Internal notifications become Zoho `Tasks` records scoped to a department via a new custom field; two pages (`/todo/accountmanager`, `/todo/inkoop-planning`) render department-scoped open todos. See spec: `docs/superpowers/specs/2026-05-24-vi-reschedule-design.md`. See live architecture: https://workflows-two.vercel.app/architecture.

**Tech Stack:**
- Next.js 15 (App Router, RSC)
- TypeScript 5.7
- Zod (input validation, already in deps)
- **Vitest** (new — added in Task 1)
- Zoho CRM v8 REST API
- Vercel Functions + Vercel Cron

---

## File Structure

**New files:**
```
src/workflows/vi-reschedule/
  types.ts                              # Outcome union + VoorinspectieRecord type
  helpers.ts                            # daysBetween, isLater, tegenpartij
  helpers.test.ts                       # unit tests
  evaluate.ts                           # pure decision tree
  evaluate.test.ts                      # unit tests for all 4 stages
  run.ts                                # I/O orchestrator (reads + applyOutcomes)
  run.test.ts                           # integration test with mocked repo
  fixtures/
    vi-buffer-ok.json                   # Stage 1 — buffer satisfied
    vi-buffer-too-tight.json            # Stage 1 — buffer broken
    vi-branch-A.json                    # Stage 2 — aanvrager picks A
    vi-branch-B.json                    # Stage 2 — aanvrager picks B
    vi-tegenpartij-accepted.json        # Stage 3 — accepted
    vi-tegenpartij-rejected.json        # Stage 3 — rejected
    vi-tegenpartij-no-tijdslot.json     # Stage 3 — defensive
    vi-klant-leverdatum-later.json      # Stage 4 — later, buffer ok
    vi-klant-leverdatum-eerder-ok.json  # Stage 4 — eerder, buffer ok
    vi-klant-leverdatum-eerder-bad.json # Stage 4 — eerder, buffer still broken

src/repo/
  voorinspecties.ts                     # get, update, applyOutcomes
  sales-orders.ts                       # get, updateLeverdatum
  products.ts                           # getMany
  tijdlijn.ts                           # logEvent (writes Datums_2)
  tasks.ts                              # createTodo, listOpen, markResolved

app/todo/accountmanager/page.tsx        # department todo list
app/todo/inkoop-planning/page.tsx       # department todo list
app/api/todo/[id]/resolve/route.ts      # POST → mark Task Completed
app/api/cron/vi-reschedule-stuck/route.ts  # nightly reconciliation

vitest.config.ts                        # test runner config
```

**Modify:**
- `src/workflows/registry.ts` — register vi-reschedule
- `app/layout.tsx` — add nav links to `/todo/*`
- `vercel.json` — add cron schedule for `vi-reschedule-stuck`
- `package.json` — add vitest devDep + scripts

---

## Task 1: Add vitest test runner

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install vitest as devDependency**

Run: `npm install -D vitest@^2 @vitest/ui@^2`
Expected: success, no peer-dep errors.

- [ ] **Step 2: Add `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globals: false,
  },
});
```

- [ ] **Step 3: Add `test` and `test:watch` scripts to `package.json`**

In `package.json` `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Add a placeholder test file and verify the runner works**

Create `src/workflows/vi-reschedule/__placeholder.test.ts`:
```ts
import { test, expect } from "vitest";
test("vitest is wired up", () => {
  expect(1 + 1).toBe(2);
});
```

Run: `npm test`
Expected: `1 passed`. Note: directory will be filled with real tests below.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/workflows/vi-reschedule/__placeholder.test.ts
git commit -m "Add vitest test runner"
```

---

## Task 2: Define types

**Files:**
- Create: `src/workflows/vi-reschedule/types.ts`

- [ ] **Step 1: Write the file**

```ts
// src/workflows/vi-reschedule/types.ts

export type Aanvrager = "aannemer" | "klant";
export type Department = "accountmanager" | "inkoop_planning";

export type VoorstelStatus =
  | "none"
  | "awaiting_evaluation"
  | "awaiting_tegenpartij"
  | "aanvrager_moet_kiezen"
  | "awaiting_klant_leverdatum"
  | "klant_kiest_leverdatum"
  | "done"
  | "rejected";

export type VoorinspectieRecord = {
  id: string;
  Leverdatum_Origineel: string;        // ISO date, snapshot of SO leverdatum at chain start
  Datum_tijd: string | null;           // existing committed VI datetime (ISO)
  VI_Voorstel_Status: VoorstelStatus;
  VI_Voorgestelde_Datum: string | null;
  VI_Voorgesteld_Door: Aanvrager | null;
  VI_Buffer_Snapshot_Dagen: number | null;
  VI_Branch_Gekozen: "A_nieuwe_vi_datum" | "B_klant_kiest_leverdatum" | null;
  VI_Nieuwe_Leverdatum_Voorstel: string | null;
  VI_Toelichting_Klant: string | null;
  VI_Tegenpartij_Reactie: "pending" | "accepted" | "rejected" | null;
  VI_Geaccepteerd_Tijdslot_Van: string | null;
};

export type Outcome =
  | { kind: "set_status"; status: VoorstelStatus; reason?: string }
  | { kind: "notify_portal_user"; who: Aanvrager | "klant" | "aannemer"; template: string }
  | { kind: "create_todo"; department: Department; title: string; body: string }
  | { kind: "update_leverdatum"; nieuweDatum: string; direction: "later" | "eerder" }
  | { kind: "commit_vi_datetime"; datetime: string }
  | { kind: "log_tijdlijn"; event: string };
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/workflows/vi-reschedule/types.ts
git commit -m "Add VI-reschedule type definitions"
```

---

## Task 3: Helper functions

**Files:**
- Create: `src/workflows/vi-reschedule/helpers.ts`
- Create: `src/workflows/vi-reschedule/helpers.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/workflows/vi-reschedule/helpers.test.ts
import { describe, expect, test } from "vitest";
import { daysBetween, isLater, tegenpartij } from "./helpers";

describe("daysBetween", () => {
  test("returns positive when end is after start", () => {
    expect(daysBetween("2026-06-25", "2026-07-15")).toBe(20);
  });
  test("returns 0 for same day", () => {
    expect(daysBetween("2026-06-25", "2026-06-25")).toBe(0);
  });
  test("handles datetime inputs (truncates to date)", () => {
    expect(daysBetween("2026-06-25T14:00:00Z", "2026-07-15T09:00:00Z")).toBe(20);
  });
});

describe("isLater", () => {
  test("true when a > b", () => {
    expect(isLater("2026-07-20", "2026-07-15")).toBe(true);
  });
  test("false when a < b", () => {
    expect(isLater("2026-07-10", "2026-07-15")).toBe(false);
  });
  test("false when a == b", () => {
    expect(isLater("2026-07-15", "2026-07-15")).toBe(false);
  });
});

describe("tegenpartij", () => {
  test("aannemer → klant", () => {
    expect(tegenpartij("aannemer")).toBe("klant");
  });
  test("klant → aannemer", () => {
    expect(tegenpartij("klant")).toBe("aannemer");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- helpers`
Expected: FAIL — helpers module not found.

- [ ] **Step 3: Implement helpers**

```ts
// src/workflows/vi-reschedule/helpers.ts
import type { Aanvrager } from "./types";

/**
 * Whole-day difference between two ISO date/datetime strings.
 * Truncates to UTC date so DST cannot shift the count.
 */
export function daysBetween(startIso: string, endIso: string): number {
  const a = Date.UTC(
    parseInt(startIso.slice(0, 4), 10),
    parseInt(startIso.slice(5, 7), 10) - 1,
    parseInt(startIso.slice(8, 10), 10),
  );
  const b = Date.UTC(
    parseInt(endIso.slice(0, 4), 10),
    parseInt(endIso.slice(5, 7), 10) - 1,
    parseInt(endIso.slice(8, 10), 10),
  );
  return Math.round((b - a) / 86_400_000);
}

export function isLater(a: string, b: string): boolean {
  return a.slice(0, 10) > b.slice(0, 10);
}

export function tegenpartij(a: Aanvrager): Aanvrager {
  return a === "aannemer" ? "klant" : "aannemer";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- helpers`
Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/workflows/vi-reschedule/helpers.ts src/workflows/vi-reschedule/helpers.test.ts
git commit -m "Add VI-reschedule helpers + tests"
```

---

## Task 4: Decision tree — Stage 1 (buffer check)

**Files:**
- Create: `src/workflows/vi-reschedule/fixtures/vi-buffer-ok.json`
- Create: `src/workflows/vi-reschedule/fixtures/vi-buffer-too-tight.json`
- Create: `src/workflows/vi-reschedule/evaluate.ts`
- Create: `src/workflows/vi-reschedule/evaluate.test.ts`

- [ ] **Step 1: Create the two Stage 1 fixtures**

`src/workflows/vi-reschedule/fixtures/vi-buffer-ok.json`:
```json
{
  "id": "VI-501",
  "Leverdatum_Origineel": "2026-07-15",
  "Datum_tijd": "2026-06-10T09:00:00+01:00",
  "VI_Voorstel_Status": "awaiting_evaluation",
  "VI_Voorgestelde_Datum": "2026-06-20",
  "VI_Voorgesteld_Door": "aannemer",
  "VI_Buffer_Snapshot_Dagen": 21,
  "VI_Branch_Gekozen": null,
  "VI_Nieuwe_Leverdatum_Voorstel": null,
  "VI_Toelichting_Klant": null,
  "VI_Tegenpartij_Reactie": null,
  "VI_Geaccepteerd_Tijdslot_Van": null
}
```
(gap 2026-06-20 → 2026-07-15 = 25 days; buffer 21 → OK)

`src/workflows/vi-reschedule/fixtures/vi-buffer-too-tight.json`:
```json
{
  "id": "VI-502",
  "Leverdatum_Origineel": "2026-07-15",
  "Datum_tijd": "2026-06-10T09:00:00+01:00",
  "VI_Voorstel_Status": "awaiting_evaluation",
  "VI_Voorgestelde_Datum": "2026-06-25",
  "VI_Voorgesteld_Door": "aannemer",
  "VI_Buffer_Snapshot_Dagen": 21,
  "VI_Branch_Gekozen": null,
  "VI_Nieuwe_Leverdatum_Voorstel": null,
  "VI_Toelichting_Klant": null,
  "VI_Tegenpartij_Reactie": null,
  "VI_Geaccepteerd_Tijdslot_Van": null
}
```
(gap 20 days; buffer 21 → broken)

- [ ] **Step 2: Write the failing Stage 1 tests**

`src/workflows/vi-reschedule/evaluate.test.ts` (initial):
```ts
import { describe, expect, test } from "vitest";
import { evaluateReschedule } from "./evaluate";
import type { VoorinspectieRecord } from "./types";
import bufferOk from "./fixtures/vi-buffer-ok.json";
import bufferTight from "./fixtures/vi-buffer-too-tight.json";

describe("Stage 1: buffer evaluation", () => {
  test("buffer ok → ask tegenpartij + notify + log", () => {
    const out = evaluateReschedule(bufferOk as VoorinspectieRecord, 14);
    expect(out).toEqual([
      { kind: "set_status", status: "awaiting_tegenpartij" },
      { kind: "notify_portal_user", who: "klant", template: "vi_voorstel_review" },
      { kind: "log_tijdlijn", event: expect.stringContaining("buffer ok") },
    ]);
  });

  test("buffer broken → aanvrager moet kiezen + notify aanvrager", () => {
    const out = evaluateReschedule(bufferTight as VoorinspectieRecord, 14);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ kind: "set_status", status: "aanvrager_moet_kiezen" });
    expect(out[1]).toEqual({ kind: "notify_portal_user", who: "aannemer", template: "vi_buffer_te_krap" });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- evaluate`
Expected: FAIL — `evaluateReschedule` not exported.

- [ ] **Step 4: Implement Stage 1**

```ts
// src/workflows/vi-reschedule/evaluate.ts
import type { Outcome, VoorinspectieRecord } from "./types";
import { daysBetween, tegenpartij } from "./helpers";

export function evaluateReschedule(
  vi: VoorinspectieRecord,
  langsteLevertijdDagen: number,
): Outcome[] {
  const out: Outcome[] = [];

  // Stage 1 — buffer check on a new proposal
  if (vi.VI_Voorstel_Status === "awaiting_evaluation") {
    const buffer = vi.VI_Buffer_Snapshot_Dagen ?? 7 + langsteLevertijdDagen;
    const gap = daysBetween(vi.VI_Voorgestelde_Datum!, vi.Leverdatum_Origineel);
    if (gap >= buffer) {
      out.push({ kind: "set_status", status: "awaiting_tegenpartij" });
      out.push({
        kind: "notify_portal_user",
        who: tegenpartij(vi.VI_Voorgesteld_Door!),
        template: "vi_voorstel_review",
      });
      out.push({ kind: "log_tijdlijn", event: "VI-voorstel geaccepteerd voor review (buffer ok)" });
    } else {
      out.push({
        kind: "set_status",
        status: "aanvrager_moet_kiezen",
        reason: `Buffer ${buffer} dagen niet gehaald (${gap} dagen)`,
      });
      out.push({
        kind: "notify_portal_user",
        who: vi.VI_Voorgesteld_Door!,
        template: "vi_buffer_te_krap",
      });
    }
    return out;
  }

  return out;
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- evaluate`
Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/workflows/vi-reschedule/evaluate.ts src/workflows/vi-reschedule/evaluate.test.ts src/workflows/vi-reschedule/fixtures/vi-buffer-ok.json src/workflows/vi-reschedule/fixtures/vi-buffer-too-tight.json
git commit -m "VI-reschedule Stage 1: buffer evaluation"
```

---

## Task 5: Decision tree — Stage 2 (aanvrager chose branch)

**Files:**
- Create: `src/workflows/vi-reschedule/fixtures/vi-branch-A.json`
- Create: `src/workflows/vi-reschedule/fixtures/vi-branch-B.json`
- Modify: `src/workflows/vi-reschedule/evaluate.ts`
- Modify: `src/workflows/vi-reschedule/evaluate.test.ts`

- [ ] **Step 1: Create the fixtures**

`vi-branch-A.json`:
```json
{
  "id": "VI-503",
  "Leverdatum_Origineel": "2026-07-15",
  "Datum_tijd": "2026-06-10T09:00:00+01:00",
  "VI_Voorstel_Status": "aanvrager_moet_kiezen",
  "VI_Voorgestelde_Datum": "2026-06-25",
  "VI_Voorgesteld_Door": "aannemer",
  "VI_Buffer_Snapshot_Dagen": 21,
  "VI_Branch_Gekozen": "A_nieuwe_vi_datum",
  "VI_Nieuwe_Leverdatum_Voorstel": null,
  "VI_Toelichting_Klant": null,
  "VI_Tegenpartij_Reactie": null,
  "VI_Geaccepteerd_Tijdslot_Van": null
}
```

`vi-branch-B.json`: same as above but `"VI_Branch_Gekozen": "B_klant_kiest_leverdatum"`.

- [ ] **Step 2: Append failing tests**

Append to `src/workflows/vi-reschedule/evaluate.test.ts`:
```ts
import branchA from "./fixtures/vi-branch-A.json";
import branchB from "./fixtures/vi-branch-B.json";

describe("Stage 2: aanvrager chose branch", () => {
  test("branch A → reset to none (new round)", () => {
    const out = evaluateReschedule(branchA as VoorinspectieRecord, 14);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ kind: "set_status", status: "none" });
  });
  test("branch B → awaiting_klant_leverdatum + notify klant", () => {
    const out = evaluateReschedule(branchB as VoorinspectieRecord, 14);
    expect(out).toEqual([
      { kind: "set_status", status: "awaiting_klant_leverdatum" },
      { kind: "notify_portal_user", who: "klant", template: "vraag_nieuwe_leverdatum_met_toelichting" },
    ]);
  });
});
```

- [ ] **Step 3: Run tests to verify Stage 2 fails**

Run: `npm test -- evaluate`
Expected: 2 new tests FAIL (Stage 2 not implemented).

- [ ] **Step 4: Add Stage 2 to evaluate.ts**

Insert before `return out;` at the end of `evaluateReschedule`:
```ts
  // Stage 2 — aanvrager chose a branch
  if (vi.VI_Voorstel_Status === "aanvrager_moet_kiezen" && vi.VI_Branch_Gekozen) {
    if (vi.VI_Branch_Gekozen === "A_nieuwe_vi_datum") {
      out.push({
        kind: "set_status",
        status: "none",
        reason: "Nieuwe ronde — aanvrager kiest andere VI-datum",
      });
    } else {
      out.push({ kind: "set_status", status: "awaiting_klant_leverdatum" });
      out.push({
        kind: "notify_portal_user",
        who: "klant",
        template: "vraag_nieuwe_leverdatum_met_toelichting",
      });
    }
    return out;
  }
```

- [ ] **Step 5: Run tests**

Run: `npm test -- evaluate`
Expected: all 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/workflows/vi-reschedule/evaluate.ts src/workflows/vi-reschedule/evaluate.test.ts src/workflows/vi-reschedule/fixtures/vi-branch-A.json src/workflows/vi-reschedule/fixtures/vi-branch-B.json
git commit -m "VI-reschedule Stage 2: branch selection"
```

---

## Task 6: Decision tree — Stage 3 (tegenpartij reacted)

**Files:**
- Create: `src/workflows/vi-reschedule/fixtures/vi-tegenpartij-accepted.json`
- Create: `src/workflows/vi-reschedule/fixtures/vi-tegenpartij-rejected.json`
- Create: `src/workflows/vi-reschedule/fixtures/vi-tegenpartij-no-tijdslot.json`
- Modify: `src/workflows/vi-reschedule/evaluate.ts`
- Modify: `src/workflows/vi-reschedule/evaluate.test.ts`

- [ ] **Step 1: Create the fixtures**

`vi-tegenpartij-accepted.json`:
```json
{
  "id": "VI-504",
  "Leverdatum_Origineel": "2026-07-15",
  "Datum_tijd": "2026-06-10T09:00:00+01:00",
  "VI_Voorstel_Status": "awaiting_tegenpartij",
  "VI_Voorgestelde_Datum": "2026-06-20",
  "VI_Voorgesteld_Door": "aannemer",
  "VI_Buffer_Snapshot_Dagen": 21,
  "VI_Branch_Gekozen": null,
  "VI_Nieuwe_Leverdatum_Voorstel": null,
  "VI_Toelichting_Klant": null,
  "VI_Tegenpartij_Reactie": "accepted",
  "VI_Geaccepteerd_Tijdslot_Van": "2026-06-20T09:00:00+02:00"
}
```

`vi-tegenpartij-rejected.json`: same but `"VI_Tegenpartij_Reactie": "rejected"` and `"VI_Geaccepteerd_Tijdslot_Van": null`.

`vi-tegenpartij-no-tijdslot.json`: same as accepted but `"VI_Geaccepteerd_Tijdslot_Van": null`.

- [ ] **Step 2: Append failing tests**

```ts
import tpAccepted from "./fixtures/vi-tegenpartij-accepted.json";
import tpRejected from "./fixtures/vi-tegenpartij-rejected.json";
import tpNoSlot from "./fixtures/vi-tegenpartij-no-tijdslot.json";

describe("Stage 3: tegenpartij reacted", () => {
  test("accepted → commit datetime + done + log + todo for inkoop", () => {
    const out = evaluateReschedule(tpAccepted as VoorinspectieRecord, 14);
    expect(out).toEqual([
      { kind: "commit_vi_datetime", datetime: "2026-06-20T09:00:00+02:00" },
      { kind: "set_status", status: "done" },
      { kind: "log_tijdlijn", event: expect.stringContaining("bevestigd") },
      expect.objectContaining({ kind: "create_todo", department: "inkoop_planning" }),
    ]);
  });

  test("accepted without tijdslot → rejected (portal bug)", () => {
    const out = evaluateReschedule(tpNoSlot as VoorinspectieRecord, 14);
    expect(out).toEqual([
      { kind: "set_status", status: "rejected", reason: expect.stringContaining("portal-bug") },
    ]);
  });

  test("rejected → reset to none + notify aanvrager", () => {
    const out = evaluateReschedule(tpRejected as VoorinspectieRecord, 14);
    expect(out).toEqual([
      { kind: "set_status", status: "none", reason: expect.stringContaining("weigerde") },
      { kind: "notify_portal_user", who: "aannemer", template: "vi_tegenpartij_weigert" },
    ]);
  });
});
```

- [ ] **Step 3: Verify they fail**

Run: `npm test -- evaluate`
Expected: 3 new tests FAIL.

- [ ] **Step 4: Add Stage 3 to evaluate.ts**

Insert before `return out;` at the end of `evaluateReschedule`:
```ts
  // Stage 3 — tegenpartij reacted
  if (vi.VI_Voorstel_Status === "awaiting_tegenpartij" && vi.VI_Tegenpartij_Reactie) {
    if (vi.VI_Tegenpartij_Reactie === "accepted") {
      if (!vi.VI_Geaccepteerd_Tijdslot_Van) {
        out.push({
          kind: "set_status",
          status: "rejected",
          reason: "Acceptatie zonder gekozen tijdslot — portal-bug",
        });
        return out;
      }
      out.push({ kind: "commit_vi_datetime", datetime: vi.VI_Geaccepteerd_Tijdslot_Van });
      out.push({ kind: "set_status", status: "done" });
      out.push({
        kind: "log_tijdlijn",
        event: `VI-datum ${vi.VI_Geaccepteerd_Tijdslot_Van} bevestigd door beide partijen`,
      });
      out.push({
        kind: "create_todo",
        department: "inkoop_planning",
        title: `VI-datum gewijzigd voor ${vi.id}`,
        body: `Nieuwe VI-datum: ${vi.VI_Geaccepteerd_Tijdslot_Van}. Controleer of inkoop/levering aansluit.`,
      });
    } else {
      out.push({
        kind: "set_status",
        status: "none",
        reason: "Tegenpartij weigerde; ronde opnieuw",
      });
      out.push({
        kind: "notify_portal_user",
        who: vi.VI_Voorgesteld_Door!,
        template: "vi_tegenpartij_weigert",
      });
    }
    return out;
  }
```

- [ ] **Step 5: Run tests**

Run: `npm test -- evaluate`
Expected: all 7 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/workflows/vi-reschedule/evaluate.ts src/workflows/vi-reschedule/evaluate.test.ts src/workflows/vi-reschedule/fixtures/vi-tegenpartij-accepted.json src/workflows/vi-reschedule/fixtures/vi-tegenpartij-rejected.json src/workflows/vi-reschedule/fixtures/vi-tegenpartij-no-tijdslot.json
git commit -m "VI-reschedule Stage 3: tegenpartij reaction"
```

---

## Task 7: Decision tree — Stage 4 (klant gave new leverdatum)

**Files:**
- Create: `src/workflows/vi-reschedule/fixtures/vi-klant-leverdatum-later.json`
- Create: `src/workflows/vi-reschedule/fixtures/vi-klant-leverdatum-eerder-ok.json`
- Create: `src/workflows/vi-reschedule/fixtures/vi-klant-leverdatum-eerder-bad.json`
- Modify: `src/workflows/vi-reschedule/evaluate.ts`
- Modify: `src/workflows/vi-reschedule/evaluate.test.ts`

- [ ] **Step 1: Create the fixtures**

`vi-klant-leverdatum-later.json`:
```json
{
  "id": "VI-505",
  "Leverdatum_Origineel": "2026-07-15",
  "Datum_tijd": "2026-06-10T09:00:00+01:00",
  "VI_Voorstel_Status": "klant_kiest_leverdatum",
  "VI_Voorgestelde_Datum": "2026-06-25",
  "VI_Voorgesteld_Door": "aannemer",
  "VI_Buffer_Snapshot_Dagen": 21,
  "VI_Branch_Gekozen": "B_klant_kiest_leverdatum",
  "VI_Nieuwe_Leverdatum_Voorstel": "2026-07-20",
  "VI_Toelichting_Klant": "Vakantie tot 18 juli.",
  "VI_Tegenpartij_Reactie": null,
  "VI_Geaccepteerd_Tijdslot_Van": null
}
```
(gap 2026-06-25 → 2026-07-20 = 25 days; buffer 21 → ok)

`vi-klant-leverdatum-eerder-ok.json`: change `Leverdatum_Origineel` to `2026-08-30`, `VI_Voorgestelde_Datum` to `2026-07-01`, `VI_Nieuwe_Leverdatum_Voorstel` to `2026-08-15`. (gap 45 days, ok)

`vi-klant-leverdatum-eerder-bad.json`: change to `VI_Voorgestelde_Datum: "2026-06-25"`, `VI_Nieuwe_Leverdatum_Voorstel: "2026-07-10"`, `Leverdatum_Origineel: "2026-07-30"`. (eerder, gap 15 days < buffer 21 → fail)

- [ ] **Step 2: Append failing tests**

```ts
import klantLater from "./fixtures/vi-klant-leverdatum-later.json";
import klantEerderOk from "./fixtures/vi-klant-leverdatum-eerder-ok.json";
import klantEerderBad from "./fixtures/vi-klant-leverdatum-eerder-bad.json";

describe("Stage 4: klant gave new leverdatum", () => {
  test("later + buffer ok → update leverdatum + awaiting_tegenpartij + todos", () => {
    const out = evaluateReschedule(klantLater as VoorinspectieRecord, 14);
    const kinds = out.map((o) => o.kind);
    expect(kinds).toContain("update_leverdatum");
    expect(kinds).toContain("set_status");
    expect(out.find((o) => o.kind === "set_status")).toMatchObject({ status: "awaiting_tegenpartij" });
    expect(out.filter((o) => o.kind === "create_todo")).toHaveLength(2);
  });

  test("eerder + buffer ok → awaiting_tegenpartij", () => {
    const out = evaluateReschedule(klantEerderOk as VoorinspectieRecord, 14);
    expect(out.find((o) => o.kind === "set_status")).toMatchObject({ status: "awaiting_tegenpartij" });
    expect(out.find((o) => o.kind === "update_leverdatum")).toMatchObject({ direction: "eerder" });
  });

  test("eerder + buffer broken → fresh round (none)", () => {
    const out = evaluateReschedule(klantEerderBad as VoorinspectieRecord, 14);
    expect(out.find((o) => o.kind === "set_status")).toMatchObject({ status: "none" });
    expect(out.find((o) => o.kind === "notify_portal_user")).toMatchObject({
      template: "vi_leverdatum_onvoldoende",
    });
  });

  test("todos emitted on both branches (eerder bad)", () => {
    const out = evaluateReschedule(klantEerderBad as VoorinspectieRecord, 14);
    expect(out.filter((o) => o.kind === "create_todo")).toHaveLength(2);
  });
});
```

- [ ] **Step 3: Verify they fail**

Run: `npm test -- evaluate`
Expected: 4 new tests FAIL.

- [ ] **Step 4: Add Stage 4 to evaluate.ts**

```ts
  // Stage 4 — klant gave a new leverdatum
  if (vi.VI_Voorstel_Status === "klant_kiest_leverdatum" && vi.VI_Nieuwe_Leverdatum_Voorstel) {
    const direction = isLater(vi.VI_Nieuwe_Leverdatum_Voorstel, vi.Leverdatum_Origineel)
      ? "later"
      : "eerder";
    out.push({
      kind: "update_leverdatum",
      nieuweDatum: vi.VI_Nieuwe_Leverdatum_Voorstel,
      direction,
    });

    const buffer = vi.VI_Buffer_Snapshot_Dagen ?? 7 + langsteLevertijdDagen;
    const gap = daysBetween(vi.VI_Voorgestelde_Datum!, vi.VI_Nieuwe_Leverdatum_Voorstel);

    if (gap >= buffer) {
      out.push({ kind: "set_status", status: "awaiting_tegenpartij" });
      out.push({
        kind: "notify_portal_user",
        who: tegenpartij(vi.VI_Voorgesteld_Door!),
        template: "vi_voorstel_review_na_leverdatum",
      });
      out.push({
        kind: "log_tijdlijn",
        event: `Leverdatum → ${vi.VI_Nieuwe_Leverdatum_Voorstel} (${direction}); buffer nu ok → tegenpartij beslist`,
      });
    } else {
      out.push({
        kind: "set_status",
        status: "none",
        reason: `Nieuwe leverdatum onvoldoende (gap ${gap}, vereist ${buffer}); nieuwe ronde`,
      });
      out.push({
        kind: "notify_portal_user",
        who: vi.VI_Voorgesteld_Door!,
        template: "vi_leverdatum_onvoldoende",
      });
      out.push({
        kind: "log_tijdlijn",
        event: `Leverdatum → ${vi.VI_Nieuwe_Leverdatum_Voorstel} (${direction}); buffer ${buffer} > gap ${gap} → nieuwe ronde`,
      });
    }
    out.push({
      kind: "create_todo",
      department: "inkoop_planning",
      title: `Leverdatum gewijzigd (${direction}) voor ${vi.id}`,
      body: `Nieuwe leverdatum: ${vi.VI_Nieuwe_Leverdatum_Voorstel} (oorspronkelijk ${vi.Leverdatum_Origineel}). Controleer inkoop en levering.`,
    });
    out.push({
      kind: "create_todo",
      department: "accountmanager",
      title: `Klant heeft leverdatum aangepast voor ${vi.id}`,
      body: `Nieuwe leverdatum (${direction}): ${vi.VI_Nieuwe_Leverdatum_Voorstel}. Toelichting klant: ${vi.VI_Toelichting_Klant ?? "—"}.`,
    });
    return out;
  }
```

Also add `isLater` to the imports at the top:
```ts
import { daysBetween, isLater, tegenpartij } from "./helpers";
```

- [ ] **Step 5: Run tests**

Run: `npm test -- evaluate`
Expected: all 11 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/workflows/vi-reschedule/evaluate.ts src/workflows/vi-reschedule/evaluate.test.ts src/workflows/vi-reschedule/fixtures/vi-klant-leverdatum-later.json src/workflows/vi-reschedule/fixtures/vi-klant-leverdatum-eerder-ok.json src/workflows/vi-reschedule/fixtures/vi-klant-leverdatum-eerder-bad.json
git commit -m "VI-reschedule Stage 4: klant new leverdatum with buffer re-eval"
```

---

## Task 8: Repo — tijdlijn

**Files:**
- Create: `src/repo/tijdlijn.ts`

- [ ] **Step 1: Write the file**

```ts
// src/repo/tijdlijn.ts
import { ZohoClient } from "../zoho/client";
import { RecordsApi } from "../zoho/records";

const records = new RecordsApi(new ZohoClient());

export async function logEvent(voorinspectieId: string, event: string): Promise<string | null> {
  const res = await records.create("Datums_2", [
    {
      Name: `VI ${voorinspectieId} — ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
      Fase: "Voorinspectie",
      Code: "VI-RESCHEDULE",
      Omschrijving: event,
      Voorinspectie: voorinspectieId,
      Status_acceptatie: "Approved",
    },
  ]);
  return res.data[0]?.details?.id ?? null;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/repo/tijdlijn.ts
git commit -m "Add tijdlijn repo (Datums_2 logEvent)"
```

---

## Task 9: Repo — products

**Files:**
- Create: `src/repo/products.ts`

- [ ] **Step 1: Write the file**

```ts
// src/repo/products.ts
import { ZohoClient } from "../zoho/client";
import { RecordsApi } from "../zoho/records";

const records = new RecordsApi(new ZohoClient());

export type ProductRow = { id: string; Levertijd: number };

export async function getMany(ids: string[]): Promise<ProductRow[]> {
  if (ids.length === 0) return [];
  const out: ProductRow[] = [];
  for (const id of ids) {
    const p = await records.get<{ id: string; Levertijd?: number }>("Products", id);
    if (p) out.push({ id: p.id, Levertijd: p.Levertijd ?? 0 });
  }
  return out;
}
```

- [ ] **Step 2: Compile check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/repo/products.ts
git commit -m "Add products repo (getMany)"
```

---

## Task 10: Repo — sales orders

**Files:**
- Create: `src/repo/sales-orders.ts`

- [ ] **Step 1: Write the file**

```ts
// src/repo/sales-orders.ts
import { ZohoClient } from "../zoho/client";
import { RecordsApi } from "../zoho/records";

const records = new RecordsApi(new ZohoClient());

export type SalesOrderRow = {
  id: string;
  Leverdatum: string | null;
  productIds: string[];
};

export async function get(id: string): Promise<SalesOrderRow | null> {
  const r = await records.get<{
    id: string;
    Leverdatum?: string;
    Product_Details?: { product?: { id: string } }[];
  }>("Sales_Orders", id);
  if (!r) return null;
  return {
    id: r.id,
    Leverdatum: r.Leverdatum ?? null,
    productIds: (r.Product_Details ?? [])
      .map((d) => d.product?.id)
      .filter((x): x is string => typeof x === "string"),
  };
}

export async function updateLeverdatum(id: string, nieuweDatum: string): Promise<void> {
  await records.update("Sales_Orders", [{ id, Leverdatum: nieuweDatum }]);
}
```

- [ ] **Step 2: Compile check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/repo/sales-orders.ts
git commit -m "Add sales-orders repo (get, updateLeverdatum)"
```

---

## Task 11: Repo — tasks (todos)

**Files:**
- Create: `src/repo/tasks.ts`

- [ ] **Step 1: Write the file**

```ts
// src/repo/tasks.ts
import { ZohoClient } from "../zoho/client";
import { RecordsApi } from "../zoho/records";
import type { Department } from "../workflows/vi-reschedule/types";

const records = new RecordsApi(new ZohoClient());

export type TaskRow = {
  id: string;
  Subject: string;
  Description: string | null;
  Department: Department | null;
  Status: string;
  Created_Time: string;
  What_Id: { id: string; name: string } | null; // related Voorinspectie
};

export async function createTodo(input: {
  department: Department;
  title: string;
  body: string;
  voorinspectieId: string;
}): Promise<string | null> {
  const due = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const res = await records.create("Tasks", [
    {
      Subject: input.title,
      Description: input.body,
      Status: "Not Started",
      Department: input.department,
      Due_Date: due,
      What_Id: input.voorinspectieId,
      $se_module: "Voorinspecties",
    },
  ]);
  return res.data[0]?.details?.id ?? null;
}

export async function listOpen(department: Department): Promise<TaskRow[]> {
  const res = await records.search<TaskRow>("Tasks", {
    criteria: `(Department:equals:${department})and(Status:not_equal:Completed)`,
    perPage: 100,
  });
  return res.data;
}

export async function markResolved(id: string): Promise<void> {
  await records.update("Tasks", [{ id, Status: "Completed" }]);
}
```

- [ ] **Step 2: Compile check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/repo/tasks.ts
git commit -m "Add tasks repo (createTodo, listOpen, markResolved)"
```

---

## Task 12: Repo — voorinspecties

**Files:**
- Create: `src/repo/voorinspecties.ts`

- [ ] **Step 1: Write the file**

```ts
// src/repo/voorinspecties.ts
import { ZohoClient } from "../zoho/client";
import { RecordsApi } from "../zoho/records";
import type { Outcome, VoorinspectieRecord } from "../workflows/vi-reschedule/types";

const records = new RecordsApi(new ZohoClient());

type RawVI = Record<string, unknown> & {
  id: string;
  Datum_tijd?: string;
  VI_Voorstel_Status?: string;
  VI_Voorgestelde_Datum?: string;
  VI_Voorgesteld_Door?: string;
  VI_Buffer_Snapshot_Dagen?: number;
  VI_Branch_Gekozen?: string;
  VI_Nieuwe_Leverdatum_Voorstel?: string;
  VI_Toelichting_Klant?: string;
  VI_Tegenpartij_Reactie?: string;
  VI_Geaccepteerd_Tijdslot_Van?: string;
  Sales_Order?: { id: string };
};

export async function get(id: string, leverdatumOrigineel: string): Promise<VoorinspectieRecord | null> {
  const r = await records.get<RawVI>("Voorinspecties", id);
  if (!r) return null;
  return {
    id: r.id,
    Leverdatum_Origineel: leverdatumOrigineel,
    Datum_tijd: r.Datum_tijd ?? null,
    VI_Voorstel_Status: (r.VI_Voorstel_Status as VoorinspectieRecord["VI_Voorstel_Status"]) ?? "none",
    VI_Voorgestelde_Datum: r.VI_Voorgestelde_Datum ?? null,
    VI_Voorgesteld_Door: (r.VI_Voorgesteld_Door as "aannemer" | "klant" | undefined) ?? null,
    VI_Buffer_Snapshot_Dagen: r.VI_Buffer_Snapshot_Dagen ?? null,
    VI_Branch_Gekozen:
      (r.VI_Branch_Gekozen as VoorinspectieRecord["VI_Branch_Gekozen"]) ?? null,
    VI_Nieuwe_Leverdatum_Voorstel: r.VI_Nieuwe_Leverdatum_Voorstel ?? null,
    VI_Toelichting_Klant: r.VI_Toelichting_Klant ?? null,
    VI_Tegenpartij_Reactie:
      (r.VI_Tegenpartij_Reactie as VoorinspectieRecord["VI_Tegenpartij_Reactie"]) ?? null,
    VI_Geaccepteerd_Tijdslot_Van: r.VI_Geaccepteerd_Tijdslot_Van ?? null,
  };
}

export async function getSalesOrderId(id: string): Promise<string | null> {
  const r = await records.get<RawVI>("Voorinspecties", id);
  return r?.Sales_Order?.id ?? null;
}

export async function update(id: string, patch: Record<string, unknown>): Promise<void> {
  await records.update("Voorinspecties", [{ id, ...patch }]);
}

export async function setBufferSnapshot(id: string, dagen: number): Promise<void> {
  await update(id, { VI_Buffer_Snapshot_Dagen: dagen });
}

export function outcomesToPatch(outcomes: Outcome[]): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const o of outcomes) {
    if (o.kind === "set_status") patch.VI_Voorstel_Status = o.status;
    if (o.kind === "commit_vi_datetime") patch.Datum_tijd = o.datetime;
  }
  return patch;
}
```

- [ ] **Step 2: Compile check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/repo/voorinspecties.ts
git commit -m "Add voorinspecties repo (get, update, outcomesToPatch)"
```

---

## Task 13: Orchestrator `run.ts`

**Files:**
- Create: `src/workflows/vi-reschedule/run.ts`
- Create: `src/workflows/vi-reschedule/run.test.ts`

- [ ] **Step 1: Write the failing test (mocked repos)**

```ts
// src/workflows/vi-reschedule/run.test.ts
import { describe, expect, test, vi } from "vitest";
import { runReschedule } from "./run";
import type { VoorinspectieRecord } from "./types";

const baseVi: VoorinspectieRecord = {
  id: "VI-501",
  Leverdatum_Origineel: "2026-07-15",
  Datum_tijd: "2026-06-10T09:00:00+01:00",
  VI_Voorstel_Status: "awaiting_evaluation",
  VI_Voorgestelde_Datum: "2026-06-20",
  VI_Voorgesteld_Door: "aannemer",
  VI_Buffer_Snapshot_Dagen: null,
  VI_Branch_Gekozen: null,
  VI_Nieuwe_Leverdatum_Voorstel: null,
  VI_Toelichting_Klant: null,
  VI_Tegenpartij_Reactie: null,
  VI_Geaccepteerd_Tijdslot_Van: null,
};

describe("runReschedule", () => {
  test("happy path: buffer ok → writes status + log + notify", async () => {
    const updates: { id: string; patch: unknown }[] = [];
    const logs: string[] = [];
    const todos: { dep: string; title: string }[] = [];
    const result = await runReschedule(
      { voorinspectieId: "VI-501" },
      {
        getVi: vi.fn().mockResolvedValue(baseVi),
        getSalesOrderId: vi.fn().mockResolvedValue("SO-302"),
        getSalesOrder: vi.fn().mockResolvedValue({
          id: "SO-302",
          Leverdatum: "2026-07-15",
          productIds: ["P1", "P2"],
        }),
        getProducts: vi.fn().mockResolvedValue([
          { id: "P1", Levertijd: 10 },
          { id: "P2", Levertijd: 14 },
        ]),
        updateVi: vi.fn(async (id, patch) => {
          updates.push({ id, patch });
        }),
        updateLeverdatum: vi.fn(),
        logEvent: vi.fn(async (_id, e) => {
          logs.push(e);
        }),
        createTodo: vi.fn(async (i) => {
          todos.push({ dep: i.department, title: i.title });
        }),
        notifyPortalUser: vi.fn(),
      },
    );
    expect(result.outcomes.length).toBeGreaterThan(0);
    expect(updates.some((u) => (u.patch as Record<string, unknown>).VI_Buffer_Snapshot_Dagen === 21)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);
  });

  test("no-op when state matches no branch", async () => {
    const result = await runReschedule(
      { voorinspectieId: "VI-501" },
      {
        getVi: vi.fn().mockResolvedValue({ ...baseVi, VI_Voorstel_Status: "done" }),
        getSalesOrderId: vi.fn().mockResolvedValue("SO-302"),
        getSalesOrder: vi.fn().mockResolvedValue({ id: "SO-302", Leverdatum: "2026-07-15", productIds: [] }),
        getProducts: vi.fn().mockResolvedValue([]),
        updateVi: vi.fn(),
        updateLeverdatum: vi.fn(),
        logEvent: vi.fn(),
        createTodo: vi.fn(),
        notifyPortalUser: vi.fn(),
      },
    );
    expect(result.outcomes).toEqual([]);
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- run`
Expected: FAIL — `runReschedule` not found.

- [ ] **Step 3: Implement `run.ts`**

```ts
// src/workflows/vi-reschedule/run.ts
import { z } from "zod";
import type { Workflow, WorkflowContext, WorkflowResult } from "../types";
import type { Department, Outcome, VoorinspectieRecord } from "./types";
import { evaluateReschedule } from "./evaluate";
import * as voorinspectiesRepo from "../../repo/voorinspecties";
import * as salesOrdersRepo from "../../repo/sales-orders";
import * as productsRepo from "../../repo/products";
import * as tijdlijnRepo from "../../repo/tijdlijn";
import * as tasksRepo from "../../repo/tasks";

const payloadSchema = z.object({
  voorinspectieId: z.string().min(1),
});
type Payload = z.infer<typeof payloadSchema>;

// Repo interface used by runReschedule — allows test injection.
export interface Repos {
  getVi: (id: string, leverdatumOrigineel: string) => Promise<VoorinspectieRecord | null>;
  getSalesOrderId: (id: string) => Promise<string | null>;
  getSalesOrder: (id: string) => Promise<{ id: string; Leverdatum: string | null; productIds: string[] } | null>;
  getProducts: (ids: string[]) => Promise<{ id: string; Levertijd: number }[]>;
  updateVi: (id: string, patch: Record<string, unknown>) => Promise<void>;
  updateLeverdatum: (id: string, nieuweDatum: string) => Promise<void>;
  logEvent: (voorinspectieId: string, event: string) => Promise<string | null>;
  createTodo: (input: { department: Department; title: string; body: string; voorinspectieId: string }) => Promise<string | null>;
  notifyPortalUser: (who: string, template: string, vi: VoorinspectieRecord) => Promise<void>;
}

const productionRepos: Repos = {
  getVi: voorinspectiesRepo.get,
  getSalesOrderId: voorinspectiesRepo.getSalesOrderId,
  getSalesOrder: salesOrdersRepo.get,
  getProducts: productsRepo.getMany,
  updateVi: voorinspectiesRepo.update,
  updateLeverdatum: salesOrdersRepo.updateLeverdatum,
  logEvent: tijdlijnRepo.logEvent,
  createTodo: tasksRepo.createTodo,
  // Stub for now — real portal-user notifications wired in a follow-up.
  notifyPortalUser: async () => {},
};

export async function runReschedule(
  payload: Payload,
  repos: Repos = productionRepos,
): Promise<{ outcomes: Outcome[] }> {
  const soId = await repos.getSalesOrderId(payload.voorinspectieId);
  if (!soId) return { outcomes: [] };
  const so = await repos.getSalesOrder(soId);
  if (!so || !so.Leverdatum) return { outcomes: [] };

  const products = await repos.getProducts(so.productIds);
  const langsteLevertijd = products.length === 0 ? 0 : Math.max(...products.map((p) => p.Levertijd));

  const vi = await repos.getVi(payload.voorinspectieId, so.Leverdatum);
  if (!vi) return { outcomes: [] };

  // Snapshot the buffer on first evaluation.
  if (vi.VI_Voorstel_Status === "awaiting_evaluation" && vi.VI_Buffer_Snapshot_Dagen == null) {
    vi.VI_Buffer_Snapshot_Dagen = 7 + langsteLevertijd;
    await repos.updateVi(payload.voorinspectieId, { VI_Buffer_Snapshot_Dagen: vi.VI_Buffer_Snapshot_Dagen });
  }

  const outcomes = evaluateReschedule(vi, langsteLevertijd);
  if (outcomes.length === 0) return { outcomes };

  // Aggregate Voorinspectie patches.
  const viPatch = voorinspectiesRepo.outcomesToPatch(outcomes);
  if (Object.keys(viPatch).length > 0) {
    await repos.updateVi(payload.voorinspectieId, viPatch);
  }

  for (const o of outcomes) {
    if (o.kind === "update_leverdatum") {
      await repos.updateLeverdatum(soId, o.nieuweDatum);
    } else if (o.kind === "log_tijdlijn") {
      await repos.logEvent(payload.voorinspectieId, o.event);
    } else if (o.kind === "create_todo") {
      await repos.createTodo({
        department: o.department,
        title: o.title,
        body: o.body,
        voorinspectieId: payload.voorinspectieId,
      });
    } else if (o.kind === "notify_portal_user") {
      await repos.notifyPortalUser(o.who, o.template, vi);
    }
    // set_status and commit_vi_datetime were folded into viPatch already.
  }

  return { outcomes };
}

export const viReschedule: Workflow<Payload> = {
  id: "vi-reschedule",
  description: "Voorinspectie reschedule chain (buffer check, branches, leverdatum)",
  trigger: {
    name: "zoho.voorinspecties.field_update",
    description: "Zoho webhook on relevant Voorinspectie field updates",
    parse: (input) => payloadSchema.parse(input),
  },
  async run(payload, _ctx: WorkflowContext): Promise<WorkflowResult> {
    const result = await runReschedule(payload);
    return {
      status: "ok",
      message: `Applied ${result.outcomes.length} outcomes`,
      data: { outcomes: result.outcomes as unknown as Record<string, unknown> },
    };
  },
};
```

- [ ] **Step 4: Run tests**

Run: `npm test -- run`
Expected: both tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/workflows/vi-reschedule/run.ts src/workflows/vi-reschedule/run.test.ts
git commit -m "Add VI-reschedule orchestrator (run.ts) with repo injection"
```

---

## Task 14: Register the workflow

**Files:**
- Modify: `src/workflows/registry.ts`

- [ ] **Step 1: Read the current file**

```bash
cat src/workflows/registry.ts
```

- [ ] **Step 2: Add the import and registration**

Replace contents of `src/workflows/registry.ts`:
```ts
import type { Workflow } from "./types";
import { voorinspectieAfgerond } from "./voorinspectie-afgerond";
import { voorinspectieNoResponse } from "./voorinspectie-no-response";
import { showroomAfspraakGeweest } from "./showroom-afspraak-geweest";
import { klantenserviceNieuw } from "./klantenservice-nieuw";
import { viReschedule } from "./vi-reschedule/run";

export const WORKFLOWS: Record<string, Workflow<unknown>> = {
  [voorinspectieAfgerond.id]: voorinspectieAfgerond as Workflow<unknown>,
  [voorinspectieNoResponse.id]: voorinspectieNoResponse as Workflow<unknown>,
  [showroomAfspraakGeweest.id]: showroomAfspraakGeweest as Workflow<unknown>,
  [klantenserviceNieuw.id]: klantenserviceNieuw as Workflow<unknown>,
  [viReschedule.id]: viReschedule as Workflow<unknown>,
};

export type WorkflowId = keyof typeof WORKFLOWS;

export function getWorkflow(id: string): Workflow<unknown> | undefined {
  return (WORKFLOWS as Record<string, Workflow<unknown>>)[id];
}
```

- [ ] **Step 3: Verify build**

Run: `npx next build`
Expected: build succeeds; `/api/webhooks/zoho` still listed; new workflow visible in the dashboard once running.

- [ ] **Step 4: Run the dashboard locally to confirm registration**

Run: `npm run dev` (in background)
Visit `http://localhost:3000/` and confirm "vi-reschedule" appears in the workflow list.
Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add src/workflows/registry.ts
git commit -m "Register vi-reschedule workflow"
```

---

## Task 15: Mark-resolved API route

**Files:**
- Create: `app/api/todo/[id]/resolve/route.ts`

- [ ] **Step 1: Write the file**

```ts
// app/api/todo/[id]/resolve/route.ts
import { NextResponse } from "next/server";
import * as tasksRepo from "@/src/repo/tasks";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  try {
    await tasksRepo.markResolved(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Build check**

Run: `npx next build`
Expected: `/api/todo/[id]/resolve` appears in route list as `ƒ (Dynamic)`.

- [ ] **Step 3: Commit**

```bash
git add app/api/todo/[id]/resolve/route.ts
git commit -m "Add POST /api/todo/[id]/resolve endpoint"
```

---

## Task 16: Department todo pages

**Files:**
- Create: `app/todo/_TodoList.tsx` (shared client component)
- Create: `app/todo/accountmanager/page.tsx`
- Create: `app/todo/inkoop-planning/page.tsx`

- [ ] **Step 1: Shared client component for the resolve button**

`app/todo/_TodoList.tsx`:
```tsx
"use client";
import { useState } from "react";

export type TodoItem = {
  id: string;
  Subject: string;
  Description: string | null;
  Created_Time: string;
  What_Id: { id: string; name: string } | null;
};

export function TodoList({ items }: { items: TodoItem[] }) {
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  async function resolve(id: string) {
    const res = await fetch(`/api/todo/${id}/resolve`, { method: "POST" });
    if (res.ok) setResolved((s) => new Set(s).add(id));
  }

  const visible = items.filter((i) => !resolved.has(i.id));
  if (visible.length === 0) {
    return (
      <div className="card">
        <p>Geen openstaande taken.</p>
      </div>
    );
  }
  return (
    <div className="grid">
      {visible.map((t) => (
        <div className="card" key={t.id}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <strong>{t.Subject}</strong>
            <span style={{ color: "var(--muted)", fontSize: 12 }}>
              {t.Created_Time.slice(0, 16).replace("T", " ")}
            </span>
          </div>
          {t.Description && (
            <p style={{ color: "var(--fg)", margin: "4px 0 12px" }}>{t.Description}</p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            {t.What_Id && <a href={`/tijdlijn/${t.What_Id.id}`}>→ Tijdlijn</a>}
            <button
              onClick={() => resolve(t.id)}
              style={{
                marginLeft: "auto",
                padding: "4px 10px",
                background: "var(--accent)",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Mark resolved
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Accountmanager page**

`app/todo/accountmanager/page.tsx`:
```tsx
import { TodoList } from "../_TodoList";
import * as tasksRepo from "@/src/repo/tasks";

export const dynamic = "force-dynamic"; // always fresh

export default async function AccountmanagerTodo() {
  const items = await tasksRepo.listOpen("accountmanager");
  return (
    <>
      <h1>Todo — Accountmanager</h1>
      <p>Open taken voor de accountmanagers.</p>
      <TodoList items={items} />
    </>
  );
}
```

- [ ] **Step 3: Inkoop & Planning page**

`app/todo/inkoop-planning/page.tsx`:
```tsx
import { TodoList } from "../_TodoList";
import * as tasksRepo from "@/src/repo/tasks";

export const dynamic = "force-dynamic";

export default async function InkoopPlanningTodo() {
  const items = await tasksRepo.listOpen("inkoop_planning");
  return (
    <>
      <h1>Todo — Inkoop & Planning</h1>
      <p>Open taken voor inkoop en planning.</p>
      <TodoList items={items} />
    </>
  );
}
```

- [ ] **Step 4: Add nav links**

Modify `app/layout.tsx`. Replace the `<nav>` block with:
```tsx
<nav>
  <a href="/">Dashboard</a>
  <a href="/tijdlijn">Tijdlijn</a>
  <a href="/todo/accountmanager">Todo: AM</a>
  <a href="/todo/inkoop-planning">Todo: I&amp;P</a>
  <a href="/architecture">Architecture</a>
  <a href="/docs">Specs</a>
  <a href="/api/status">/api/status</a>
</nav>
```

- [ ] **Step 5: Build check**

Run: `npx next build`
Expected: both `/todo/accountmanager` and `/todo/inkoop-planning` listed as `ƒ (Dynamic)`.

- [ ] **Step 6: Commit**

```bash
git add app/todo app/layout.tsx
git commit -m "Add department todo pages (accountmanager, inkoop-planning)"
```

---

## Task 17: Reconciliation cron

**Files:**
- Create: `app/api/cron/vi-reschedule-stuck/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Write the cron route**

`app/api/cron/vi-reschedule-stuck/route.ts`:
```ts
import { NextResponse } from "next/server";
import { ZohoClient } from "@/src/zoho/client";
import { RecordsApi } from "@/src/zoho/records";
import { runReschedule } from "@/src/workflows/vi-reschedule/run";

export const runtime = "nodejs";
export const maxDuration = 60;

// Terminal statuses we want to exclude (rest = "in flight" → reconcile).
const TERMINAL = ["done", "rejected", "none"];

export async function GET(req: Request): Promise<Response> {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const records = new RecordsApi(new ZohoClient());
  const stale = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  // Zoho search criteria doesn't support :in:; chain :not_equal:.
  const notTerminal = TERMINAL.map((s) => `(VI_Voorstel_Status:not_equal:${s})`).join("and");
  const criteria = `${notTerminal}and(Modified_Time:before:${stale})`;
  const res = await records.search<{ id: string }>("Voorinspecties", { criteria, perPage: 50 });

  const results: { id: string; outcomes: number }[] = [];
  for (const r of res.data) {
    try {
      const out = await runReschedule({ voorinspectieId: r.id });
      results.push({ id: r.id, outcomes: out.outcomes.length });
    } catch (err) {
      console.error("vi-reschedule-stuck reconciliation failed", r.id, err);
    }
  }

  return NextResponse.json({ checked: res.data.length, processed: results });
}
```

- [ ] **Step 2: Register the cron in `vercel.json`**

Replace `vercel.json` contents:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/showroom-review-followup",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/voorinspectie-no-response",
      "schedule": "30 8 * * *"
    },
    {
      "path": "/api/cron/vi-reschedule-stuck",
      "schedule": "0 7 * * *"
    }
  ]
}
```

- [ ] **Step 3: Build check**

Run: `npx next build`
Expected: `/api/cron/vi-reschedule-stuck` listed as `ƒ (Dynamic)`.

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/vi-reschedule-stuck vercel.json
git commit -m "Add nightly vi-reschedule-stuck reconciliation cron"
```

---

## Task 18: Zoho-side setup (manual checklist — not code)

This task contains **no code changes**. The agent should print the checklist for the human operator and pause for confirmation before continuing. If running unsupervised, mark the task complete only after the operator has confirmed each item is done.

- [ ] **Step 1: In Zoho Setup → Modules → Voorinspecties → Fields, add these custom fields:**

| API name (auto-derived) | Display name | Type | Picklist values |
|---|---|---|---|
| `VI_Voorstel_Status` | VI Voorstel Status | Picklist | `none`, `awaiting_evaluation`, `awaiting_tegenpartij`, `aanvrager_moet_kiezen`, `awaiting_klant_leverdatum`, `klant_kiest_leverdatum`, `done`, `rejected` |
| `VI_Voorgestelde_Datum` | VI Voorgestelde Datum | Date | — |
| `VI_Voorgestelde_Tijdblokken` | VI Voorgestelde Tijdblokken | Multi-line | — |
| `VI_Voorgesteld_Door` | VI Voorgesteld Door | Picklist | `aannemer`, `klant` |
| `VI_Voorstel_Aangemaakt` | VI Voorstel Aangemaakt | Date/Time | — |
| `VI_Buffer_Snapshot_Dagen` | VI Buffer Snapshot Dagen | Number (Integer) | — |
| `VI_Branch_Gekozen` | VI Branch Gekozen | Picklist | `A_nieuwe_vi_datum`, `B_klant_kiest_leverdatum` |
| `VI_Nieuwe_Leverdatum_Voorstel` | VI Nieuwe Leverdatum Voorstel | Date | — |
| `VI_Toelichting_Klant` | VI Toelichting Klant | Multi-line | — |
| `VI_Tegenpartij_Reactie` | VI Tegenpartij Reactie | Picklist | `pending`, `accepted`, `rejected` |
| `VI_Reschedule_Cyclus` | VI Reschedule Cyclus | Number (Integer) | — |
| `VI_Geaccepteerd_Tijdslot_Van` | VI Geaccepteerd Tijdslot Van | Date/Time | — |
| `VI_Geaccepteerd_Tijdslot_Tot` | VI Geaccepteerd Tijdslot Tot | Date/Time | — |

- [ ] **Step 2: In Zoho Setup → Modules → Tasks → Fields, add this custom field:**

| API name | Display name | Type | Picklist values |
|---|---|---|---|
| `Department` | Department | Picklist | `accountmanager`, `inkoop_planning` |

- [ ] **Step 3: In Zoho Setup → Automation → Workflow Rules, create a new rule:**

| Setting | Value |
|---|---|
| Module | Voorinspecties |
| Rule name | LAB21 — VI Reschedule webhook |
| When | On a record action → Field update |
| Watched fields | `VI_Voorstel_Status`, `VI_Branch_Gekozen`, `VI_Tegenpartij_Reactie`, `VI_Nieuwe_Leverdatum_Voorstel` |
| Condition | none (always) |
| Instant action | Webhook |

For the webhook action:
- URL: `https://workflows-two.vercel.app/api/webhooks/zoho`
- Method: POST
- Body type: **JSON** (not form-data — the route handler at `app/api/webhooks/zoho/route.ts` calls `JSON.parse`)
- Body parameters: `voorinspectieId = ${Voorinspecties.id}` (Zoho substitutes the record id)
- Custom headers: `Authorization: Bearer <ZOHO_WEBHOOK_SECRET>` and `x-workflow: vi-reschedule`

- [ ] **Step 4: Verify the wiring by triggering one VI field update**

In Zoho, open a non-production test Voorinspectie. Manually set `VI_Voorstel_Status = awaiting_evaluation`. Watch `vercel logs --prod` for the webhook fire.

Expected: log line "Applied N outcomes" or "no outcomes" (depending on state).

- [ ] **Step 5: Confirmation (no commit — this task is config-only)**

Print to the operator: "Zoho-side setup complete? Confirm before proceeding to Task 19."

---

## Task 19: Cutover — disable parallel Zoho-native workflow rules

Only run this task **after the new chain has handled at least one real production reschedule successfully**. This is the irreversible step. No code changes; pure config in Zoho.

- [ ] **Step 1: For each of these rules, set Active = OFF in Zoho Setup → Automation → Workflow Rules:**

| Rule | Module | Reason |
|---|---|---|
| `LAB21-T177 - Datum voorinspectie updaten na acceptatie` | Voorinspecties | Replaced by Stage 3 `commit_vi_datetime` |
| `LAB21-T180 - Klant informeren over keuze voorinspectie datum/tijd` | Voorinspecties | Replaced by `notify_portal_user` |
| `LAB21-T182 - Actie accountmanager als klant niet reageert` | Voorinspecties | Replaced by `vi-reschedule-stuck` cron |
| `LAB21-T183 - Herinnering acceptatie voorgestelde dagen na 24 uur` | Voorinspecties | Replaced by `vi-reschedule-stuck` cron |

- [ ] **Step 2: Record disable dates**

Append a new entry to the bottom of `docs/superpowers/specs/2026-05-24-vi-reschedule-design.md`:
```markdown
## 16. Cutover log

| Date | Rule | Action |
|---|---|---|
| YYYY-MM-DD | LAB21-T177 | Disabled |
| YYYY-MM-DD | LAB21-T180 | Disabled |
| YYYY-MM-DD | LAB21-T182 | Disabled |
| YYYY-MM-DD | LAB21-T183 | Disabled |
```

Fill in `YYYY-MM-DD` with the actual date of cutover.

- [ ] **Step 3: Commit the cutover log**

```bash
git add docs/superpowers/specs/2026-05-24-vi-reschedule-design.md
git commit -m "Record VI-reschedule cutover dates"
```

- [ ] **Step 4: Final smoke test**

Trigger one real reschedule (or wait for one to happen organically). Confirm:
- `Datum_tijd` updates when accepted
- Leverdatum updates when klant chooses
- Tasks appear at `/todo/accountmanager` and `/todo/inkoop-planning`
- Old rule names don't appear in the Zoho audit log for this VI

---

## Done

All 19 tasks complete. The VI-reschedule chain is live, observable via `/tijdlijn` + the department todo lists, self-healing via the nightly cron, and Zoho-native rules T177/T180/T182/T183 are disabled.

**Follow-ups not in this plan (open question 4-followup):** confirm whether the klantenportal should show the acceptance UI inline after leverdatum submission (current default) or as a separate notification flow.
