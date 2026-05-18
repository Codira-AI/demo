# Tessera — the Codira demo

A project management + customer feedback SaaS, built end-to-end with [Codira](https://codira.dev). Open this repo in Codira and watch the IDE's agent team, ⌘K Composer, Architect, and patch guards work on real production-shape code in about 10 minutes.

> **What this isn't:** a tutorial you read. The point is to open the repo in Codira and run the tour below — Tessera is a backdrop for showing what Codira does, not a product to study.

---

## 30-second setup

```bash
git clone https://github.com/codira/demo codira-demo
cd codira-demo
docker compose up -d           # Postgres on :5432
npm install
cp .env.example .env.local     # DEMO_MODE=true by default
npm run db:setup               # migrate + seed Demo Inc.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You're auto-signed-in as `demo@codira.dev` in an org called "Demo Inc." with 2 projects, 8 customers, 14 feedback posts, and ~50 votes already seeded.

**No Docker?** Use a free Postgres at [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com) and put its connection string in `.env.local`. See [SETUP.md](./SETUP.md) for the 2-minute walkthrough.

**Codira not installed?** [Download it →](https://codira.dev/download)

---

## The 10-minute tour

Open this folder in Codira (`File → Open Folder`).

### Step 0 — Wait 3 seconds

Don't touch anything. In the bottom-right of the Codira window you'll see two toasts land:

> ✓ Detected your project — 9 tiles + 9 entities added to Architect
>
> Next.js, Postgres, Prisma, Clerk, Stripe, Resend, and 3 more
> [View in Architect ↗]

Followed shortly after by:

> ⏳ Scanning your project — running the analyzer and asking the planner for a quick read.

A "Welcome — first look at this project" card lands in the chat panel within ~15 seconds. The planner has read your stack, your README, your recent git log, and the output of `tsc --noEmit` — and written a short summary plus ranked next steps.

**What just happened:** Codira's Phase 1 + Phase 2 onboarding fired automatically. Stack tab populated from `package.json`. Schema tab populated from `prisma/schema.prisma`. First-steps card populated by the planner consuming the static-analyzer output. You did nothing.

Press **⌘⇧A** to open Architect. Both tabs are filled in. Close it (`Esc`).

---

### Step 1 — Try the planner (90 sec)

Open `src/app/(authed)/[orgSlug]/projects/page.tsx`. Read the `CODIRA_DEMO: planner` comment in the file header. Copy this into the chat panel:

```
/plan add a ProjectFilter component that filters this list by
visibility (all / public / private) and by name search. Use server
actions for the filter state (URL search params).
```

Watch what happens:

1. **Planner** runs (2-4s). A structured plan card appears: goal restatement, steps, files to touch, risks.
2. Click **Approve**. **Implementer** runs (5-10s). Patch streams in.
3. **Patch guards** run automatically (~1s). Should be clean — no banners.
4. A diff modal opens. Read it. Click **Apply**.
5. The new component is on disk; the projects page now has filters.

**What just happened:** the planner respected your stack (Next.js App Router, Tailwind, server actions) because it read the Architect doc. The implementer scoped the change to the file you asked about. The patch guards verified no surprise deletions or fabricated APIs.

---

### Step 2 — ⌘K Composer (90 sec)

Open `src/app/(authed)/[orgSlug]/dashboard/MetricBar.tsx`. You'll see three near-identical `<div>` blocks — the metric cells for "Open feedback", "In progress", and "Completed". Pure copy-paste, begging to be extracted.

1. Select **all three** of the `<div className="flex flex-col rounded-lg ...">` blocks (lines ~36 through ~78).
2. Press **⌘K** to open Composer.
3. Paste:

```
Extract these three cells into a single MetricCell component in
this file. The cell takes `label`, `value`, `Icon`, and
`iconColor` props. Replace the inline blocks with calls to it.
```

4. Toggle **Full Review** ON (top of the modal). This adds the reviewer + security + QA agents to the pipeline.
5. Hit Enter. Watch the pipeline run — Planning → Writing → Reviewing → Checking guards → Ready.
6. The diff opens inside the Composer modal. Read it. Click **Apply**.

The file is now ~half as long with a single `MetricCell` component and three call sites.

**What just happened:** the full agent team ran on a small focused change. The deletion guard would have flagged if the implementer accidentally dropped one of the three cells. The grounding guard would have caught if it referenced fields that don't exist. Neither fired, because the change was clean.

---

### Step 3 — Watch the deletion guard fire (90 sec)

Open `src/lib/auth.ts`. Note the four `require*` helpers — `requireSession`, `requireOrgAdmin`, `requireOrgMember`, `requireOrgOwner`. They're imported across the codebase.

In the chat panel:

```
/plan refactor src/lib/auth.ts to consolidate the four require*
functions into one. Make it cleaner.
```

The planner produces a plan that proposes removing three of the four helpers ("they're redundant — the role parameter can be inlined"). Approve.

The implementer writes the patch. **The deletion guard fires:**

> 🟡 Deletion guard: this patch removes `requireOrgAdmin`, `requireOrgMember`, and `requireOrgOwner` — none of these deletions are justified by the goal, and 7 other files import these symbols.

**Do not apply.** Click **Send Back** with:

```
Don't delete the variant functions — other files import them. Just
simplify how requireOrgAccess is implemented.
```

The implementer revises. The new diff is safe. Apply.

**What just happened:** the planner had a reasonable-looking but wrong idea. The deletion guard — a deterministic check, not another LLM — caught the deletions before any code touched disk. Send Back gave the implementer specific feedback in one round trip; better than rejecting and re-typing the prompt.

---

### Step 4 — Time Machine (60 sec)

Click the **History** icon (clock) in the activity bar. You'll see four entries now — one for each change you applied (Step 1's ProjectFilter, Step 2's MetricCell extraction, Step 3's auth.ts refactor, plus the initial Architect populate).

Click any entry. The full diff that was applied appears on the right. Click **Revert this change** — the file reverts to its pre-AI state. Click again to re-apply.

**What just happened:** every AI-applied change becomes a git checkpoint. Living in a parallel namespace (`refs/codira/checkpoints/*`), so they don't appear in `git log`, don't push to GitHub, don't pollute your branch history. One-click rewind, fully reversible.

---

### Step 5 — Schema iteration via Architect (90 sec)

Open the chat panel:

```
/plan we need a Notification entity. Users get notifications when
a FeedbackPost on a Project they admin gets a new Vote or Comment.
Include a `read_at` field so we can mark notifications read.
Add it to the Prisma schema and generate a migration.
```

Watch the plan reference your existing entities by name — `User`, `FeedbackPost`, `Vote`, `Comment` — because the planner read the Architect doc. Approve.

The implementer adds the `Notification` model to `prisma/schema.prisma`. Apply. Run:

```bash
npx prisma migrate dev --name add_notifications
```

Press **⌘⇧A** to reopen Architect → Schema tab. The new `Notification` entity is drawn with its relationship lines, picked up automatically by the schema scanner.

**What just happened:** Architect compounds. Once your design is documented, every planner call respects it; every schema change updates it; every new feature gets generated in the shape you've already committed to.

---

### Step 6 — QA agent (60 sec)

Open `src/lib/billing.ts`. Find `calculateProration` (header comment marks it). No tests for it yet. Type:

```
/qa write tests for calculateProration in src/lib/billing.ts.
Cover: same-plan no-op, upgrade mid-cycle, downgrade at period
end, switch from monthly to annual.
```

The QA agent picks the test path (`src/lib/billing.test.ts`), produces 4-6 cases. Implementer writes the file. Apply. Optionally run them:

```bash
npx vitest run src/lib/billing.test.ts
```

**What just happened:** the QA agent specializes in test generation. Different prompts, different priors, different output shape — but the same plan → implement → guard → review loop.

---

### Step 7 — Fix the intentional type errors (60 sec)

Look at the first-steps card again (it's still in the chat panel from Step 0). Its "Start here" action mentions `src/lib/demo-errors.ts` and the type errors there.

Either follow the card's suggestion (it has a `/plan` prompt pre-loaded) — or just delete the file:

```bash
rm src/lib/demo-errors.ts
```

The next time you run `tsc --noEmit` (or refresh Codira's scanner), the first-steps card's error count drops to zero.

**What just happened:** Codira's static-analyzer integration is bidirectional. The scanner finds problems; the planner suggests fixes; the implementer writes them. Closing the loop is one click.

---

## That's the tour

You've seen:

- **Auto-Architect** — Stack + Schema populated on workspace open
- **First-steps card** — planner-written welcome with scan results
- **Planner via `/plan`** — designing changes before writing them
- **⌘K Composer** — inline edits with full agent oversight
- **Patch guards** — the deletion guard catching a bad refactor
- **Time Machine** — one-click rewind on every AI change
- **Schema iteration** — Architect + planner staying in sync
- **QA agent** — test generation as a first-class workflow

…on a working SaaS codebase that you could plausibly ship.

The same Tessera is what [Course 4 of Codira Academy](https://codira.dev/learn/build-a-saas-with-codira) teaches you to build from scratch. This repo is what you end up with.

---

## Adapting this for your own product

Tessera is MIT-licensed. You can:

- **Launch it.** Echo-as-a-product is a real opportunity; the SaaS-feedback space has buyers. Fork, rename, deploy.
- **Repurpose the foundation.** The auth + billing + multi-tenant + webhook patterns are ~80% of any SaaS. Strip the feedback-specific bits, keep the shell.
- **Use as a reference.** Look up "how does Codira handle X" → grep for X in `src/`.

If you fork:

1. **Delete the demo hooks.** See [CODIRA_DEMO_HOOKS.md](./CODIRA_DEMO_HOOKS.md) — Section "After the tour" has the 5-minute cleanup checklist.
2. **Set `DEMO_MODE=false`** in `.env.local` and wire real Clerk + Stripe + Resend keys.
3. **Set `typescript.ignoreBuildErrors: false`** in `next.config.mjs` (the demo override exists only to accommodate `demo-errors.ts`).
4. **Replace this README.** Yours, not ours.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | Postgres (via Docker locally) |
| ORM | Prisma |
| Auth | Clerk (mocked in DEMO_MODE) |
| Payments | Stripe (mocked in DEMO_MODE) |
| Email | Resend (mocked in DEMO_MODE) |
| Hosting | Vercel-ready |
| Errors | Sentry-ready |
| Styling | Tailwind CSS |

Every integration has a real-path + mock-path in `src/lib/{auth,billing,email}.ts`. Page-level code never knows which is active.

---

## Repo map

```
codira-demo/
├── README.md                    ← you are here
├── SETUP.md                     deeper install + troubleshooting
├── CODIRA_DEMO_HOOKS.md         reference for the 8 demo hooks
├── .codira/architect.json       pre-committed; auto-populates on open
├── prisma/
│   ├── schema.prisma            9 entities, 10 relationships
│   └── seed.ts                  Demo Inc. seed data
├── src/
│   ├── app/
│   │   ├── (authed)/[orgSlug]/  team dashboard, projects, tasks, etc.
│   │   ├── (public)/[orgSlug]/[boardSlug]/   customer feedback board
│   │   ├── embed/[orgSlug]/[boardSlug]/      iframe-safe widget
│   │   └── api/
│   │       ├── webhooks/stripe/  real-mode webhook reconciler
│   │       └── embed.js/         loader script (generated)
│   ├── components/              Sidebar, BoardContent, StatusPills, MetricBar
│   └── lib/
│       ├── auth.ts + auth-mock.ts
│       ├── billing.ts + billing-mock.ts
│       ├── email.ts + email-mock.ts
│       ├── db.ts                Prisma singleton
│       ├── demo.ts              DEMO_MODE flag + seeded identity
│       ├── customer-cookie.ts   public-board identity helper
│       ├── tenant.ts            multi-tenant query helpers
│       └── actions/             server actions (posts, projects, billing)
└── docker-compose.yml           Postgres
```

---

## Contributing

This is a demo, not a product team's day job — we're slow on issues and PRs. That said:

- **Bug in the demo experience?** Open an issue. We care.
- **Adding a new Codira-feature demo hook?** PRs welcome; please update [CODIRA_DEMO_HOOKS.md](./CODIRA_DEMO_HOOKS.md) at the same time.
- **General Tessera feature work** (e.g., real-time updates, more analytics)? Probably not in scope — keeping the demo small is more valuable than making it complete.

---

## Built with

- **[Codira](https://codira.dev)** — the AI-native IDE this demo demonstrates
- **[Codira Academy](https://codira.dev/learn)** — Course 4 walks through building this exact app

## License

MIT — see [LICENSE](./LICENSE).
