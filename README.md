# Tessera — codira/demo

A project management + customer feedback SaaS, built end-to-end with [Codira](https://codira.dev). The official Codira demo repo.

> **Status:** scaffolding in progress. The full 10-minute interactive tour lands with v1.0.0.

## What this is

Tessera is a real-shape multi-tenant SaaS: teams manage internal projects and tasks, while customers submit feedback and vote on what gets built next. Built with the modern indie-hacker stack — Next.js 15, Prisma + Postgres, Clerk (multi-tenant orgs), Stripe, Resend, deployable to Vercel.

The point isn't the product. The point is to give you a real codebase to open in Codira and watch the IDE's features land on production-shape code.

## 30-second setup

```bash
git clone https://github.com/codira/demo codira-demo
cd codira-demo
docker compose up -d           # Postgres
npm install
cp .env.example .env.local     # DEMO_MODE=true by default
npm run db:setup               # migrate + seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You're auto-signed-in as `demo@codira.dev` in an org called "Demo Inc." with seed data already populated.

## Open in Codira for the full tour

The interactive tour is in the README of v1.0.0 — coming soon. For now, opening this folder in Codira will:

1. **Auto-populate the Architect Stack and Schema tabs** within 3 seconds
2. **Post a "first steps" planner card** to the chat panel after the static analyzer runs
3. Let you try `/plan`, ⌘K Composer, Time Machine, and the patch guards on real code

## License

MIT — fork, modify, ship.
