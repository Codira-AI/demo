# Codira demo hooks

Tessera ships with eight intentional "demo hooks" — places in the
code where each major Codira feature has something obvious to
demonstrate. Each is tagged in the source with a `CODIRA_DEMO`
comment so you can find them via grep:

```bash
grep -rn 'CODIRA_DEMO' src/ prisma/
```

The README's tour script walks through them in order. This document
is the cheat sheet for video producers, demo presenters, and anyone
adapting the demo to their own setup.

---

## The 8 hooks

| # | Hook | What it demos | Location |
|---|---|---|---|
| 1 | Auto-Architect on open | Phase 1 detection | (no code — fires automatically) |
| 2 | First-steps card | Phase 2 scanner + planner | (no code — fires automatically) |
| 3 | Planner via `/plan` | Chat panel + agent team | `src/app/(authed)/[orgSlug]/projects/page.tsx` |
| 4 | ⌘K Composer extraction | Composer + patch guards | `src/app/(authed)/[orgSlug]/dashboard/MetricBar.tsx` |
| 5 | Intentional type error | Static analyzer | `src/lib/demo-errors.ts` |
| 6 | QA agent target | Test generation | `src/lib/billing.ts` (`calculateProration`) |
| 7 | Deletion-guard target | Patch guards | `src/lib/auth.ts` (four `require*` helpers) |
| 8 | Schema iteration | Architect Schema tab | `prisma/schema.prisma` (header comment) |

---

## Hook details + prompts to paste

### Hook 1 — Auto-Architect on open

**Triggers:** open the workspace folder in Codira.

**Expect:** within 3 seconds, a toast in the bottom-right:

> ✓ Detected your project — 9 tiles + 9 entities added to Architect
> Next.js, Postgres, Prisma, Clerk, Stripe, Resend, and 3 more
> [View in Architect ↗]

Press ⌘⇧A to confirm — Stack tab is filled in; Schema tab has all
9 entities and 10 relationships drawn. No prompt needed; this is
purely Codira detecting the project shape.

### Hook 2 — First-steps card

**Triggers:** automatic, immediately after Hook 1.

**Expect:** a "Welcome — first look at this project" card in the
chat panel with a planner-written summary referencing the
intentional type errors in `src/lib/demo-errors.ts` and the
missing `ProjectFilter` referenced from `projects/page.tsx`.

### Hook 3 — Planner via `/plan`

**File:** `src/app/(authed)/[orgSlug]/projects/page.tsx`

**Triggers:** type this in the chat panel:

```
/plan add a ProjectFilter component that filters this list by
visibility (all / public / private) and by name search. Use server
actions for the filter state (URL search params).
```

**Expect:** the planner reads the file, produces a plan referencing
Next.js App Router patterns + Tailwind (because the Architect doc
tells it that's the stack). Approve. Implementer writes the
component + wires it into the page. Patch guards run (should be
clean). Diff appears. Apply.

### Hook 4 — ⌘K Composer extraction

**File:** `src/app/(authed)/[orgSlug]/dashboard/MetricBar.tsx`

**Triggers:**
1. Open the file.
2. Select all three `<div className="flex flex-col rounded-lg ...">`
   blocks (the metric cells — they're visually identical).
3. Press ⌘K.
4. Paste:

```
Extract these three cells into a single MetricCell component in
this file. The cell takes `label`, `value`, `Icon`, and
`iconColor` props. Replace the inline blocks with calls to it.
```

**Expect:** Composer modal runs planner → implementer → guards in
~10 seconds. Diff shows the file cut roughly in half with a new
`MetricCell` component + three call sites. Patch guards green.
Apply.

### Hook 5 — Intentional type error

**File:** `src/lib/demo-errors.ts`

**Triggers:** automatic — Codira's Phase 2 scanner runs `tsc
--noEmit` on workspace open and finds the two intentional type
errors. They surface in the first-steps card (Hook 2).

**Expect:** the first-steps card's "Start here" reads something
like:

> Fix the type errors in src/lib/demo-errors.ts — the missing
> await on fetchQueuedCount() and the wrong-typed argument in
> _sumPair().

**To close the loop:** either fix the errors (paste the same goal
into `/plan` and apply the fix) or delete the file entirely.

### Hook 6 — QA agent target

**File:** `src/lib/billing.ts` (function `calculateProration`)

**Triggers:** type in the chat panel:

```
/qa write tests for calculateProration in src/lib/billing.ts.
Cover: same-plan no-op, upgrade mid-cycle, downgrade at period
end, switch from monthly to annual.
```

**Expect:** the QA agent produces a test file at
`src/lib/billing.test.ts` (or similar — implementer picks the
path). 4-6 cases. Approve, apply, optionally run them.

### Hook 7 — Deletion-guard target

**File:** `src/lib/auth.ts`

**Triggers:** type in the chat panel:

```
/plan refactor src/lib/auth.ts to consolidate the four require*
functions into one. Make it cleaner.
```

**Expect:** the planner proposes a "simplification" that removes
`requireOrgAdmin`, `requireOrgMember`, `requireOrgOwner` — even
though other files import them. The DELETION GUARD fires with a
yellow banner:

> This patch removes requireOrgAdmin, requireOrgMember,
> requireOrgOwner — none of these deletions are justified by the
> goal.

**Don't apply.** Click **Send Back** with:

```
Don't delete the variant functions — other files import them.
Just simplify how requireOrgAccess is implemented.
```

The implementer revises. The new diff is safe. Apply.

### Hook 8 — Schema iteration

**File:** `prisma/schema.prisma` (comment at top of file)

**Triggers:** type in the chat panel:

```
/plan we need a Notification entity. Users get notifications when
a FeedbackPost on a Project they admin gets a new Vote or Comment.
Include a `read_at` field so we can mark notifications read.
Add it to the Prisma schema and generate a migration.
```

**Expect:** the planner references your existing entities by name
(User, FeedbackPost, Vote, Comment) because it read the Architect
doc. The schema gets a Notification model with the right
relationships. Approve, apply. Open Architect → Schema tab. The
new Notification entity is drawn with its relationship lines.

---

## After the tour

Anyone forking Tessera for their own use will want to:

1. Delete `src/lib/demo-errors.ts` (Hook 5)
2. Remove the `typescript.ignoreBuildErrors` flag from
   `next.config.mjs` (added to accommodate the demo errors)
3. Remove the `CODIRA_DEMO` comment blocks from each hook file
4. Remove this `CODIRA_DEMO_HOOKS.md` file
5. Rewrite the README to reflect their actual product

Steps 1-4 take ~5 minutes total. Step 5 takes as long as you
want it to.
