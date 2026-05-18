# Tessera setup

Detailed installation, troubleshooting, and the path to switching from demo mode to a real-services deployment. For the 30-second path, see [README.md](./README.md).

---

## Prerequisites

- **Node.js 20+** — `node -v` to check
- **npm 10+** (ships with Node 20+)
- **Postgres 14+** — easiest via Docker; alternatives below
- **Codira IDE** — [download](https://codira.dev/download). Tessera runs without it, but the tour script assumes you have it.

Optional:

- **Docker Desktop** or **OrbStack** for the bundled Postgres
- **Stripe CLI** for testing webhooks in real mode

---

## Demo mode (the default)

Demo mode runs Tessera end-to-end with no third-party accounts. Clerk, Stripe, and Resend are mocked in-process; everything else is real (Postgres, Next.js, Prisma).

### Standard install

```bash
git clone https://github.com/Codira-AI/demo codira-demo
cd codira-demo

# Database
docker compose up -d
# Wait ~2s for Postgres to accept connections

# Node deps
npm install

# Environment
cp .env.example .env.local
# DEMO_MODE=true is set; no other edits needed.

# Schema + seed data
npm run db:setup    # runs migrate dev + seed

# Boot the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You're signed in as `demo@codira.dev` in "Demo Inc." with seed data already populated.

### Common paths in the running app

- `/` — health check + entry points
- `/demo-inc/dashboard` — team dashboard
- `/demo-inc/projects` — projects list
- `/demo-inc/projects/ship-tracker` — project detail
- `/demo-inc/feedback` — admin view of customer feedback
- `/demo-inc/billing` — plan upgrade flow (demo writes happen in-process)
- `/demo-inc/ship-tracker` — public feedback board (no auth needed)
- `/embed/demo-inc/ship-tracker` — embeddable widget

### Resetting state mid-demo

To reset the database to the seeded state (useful between video recordings):

```bash
npm run db:reset
# Same as: prisma migrate reset --force, which also re-runs the seed
```

---

## Postgres without Docker

If you don't want to install Docker, two free alternatives work fine.

### Option A — Neon (recommended if Docker isn't an option)

1. Sign up at [neon.tech](https://neon.tech). Free tier is generous; no card.
2. Create a project. Copy the connection string from the dashboard — it looks like:

   ```
   postgresql://user:pass@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

3. Edit `.env.local`:

   ```bash
   DATABASE_URL="<paste the Neon string>"
   ```

4. Run the rest as normal:

   ```bash
   npm install
   npm run db:setup
   npm run dev
   ```

Skip the `docker compose` step.

### Option B — Supabase

Identical to Neon — sign up, create a project, copy the connection string from Project Settings → Database. Tessera doesn't use any other Supabase services; it's just Postgres.

### Option C — Local Postgres install

If you already have Postgres running locally (Homebrew, Postgres.app, etc.):

```bash
createdb tessera
```

Then set `DATABASE_URL="postgresql://localhost:5432/tessera"` (adjust user/password if your local install uses non-default credentials).

---

## Real mode — Clerk + Stripe + Resend

To run Tessera against real services (e.g., before deploying your fork to production), set `DEMO_MODE=false` and fill in keys for each integration.

### Clerk (auth)

1. Sign up at [clerk.com](https://clerk.com). Free tier.
2. Create an Application. Choose **Email** and **Google** for sign-in options.
3. Enable **Organizations** in Clerk Dashboard → Configure → Organizations.
4. Copy `Publishable key` and `Secret key` from API Keys. Paste into `.env.local`:

   ```bash
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
   CLERK_SECRET_KEY="sk_test_..."
   ```

5. Restart `npm run dev`.

Once Clerk is wired, Tessera's middleware will redirect unauthenticated requests to `/sign-in` (a Clerk-hosted page). You'll need to sign up + create an organization manually; the seeded `demo@codira.dev` user only exists in demo mode.

**Important:** the seed script and the page templates assume the authenticated user is already linked to an Organization row in the DB. In production, you'd add a Clerk webhook handler that mirrors org/user creation events into your DB — see [Clerk's docs on user/org sync](https://clerk.com/docs/users/sync-data) for the canonical pattern.

### Stripe (billing)

1. Sign up at [stripe.com](https://stripe.com). Test mode is enabled by default.
2. Dashboard → Developers → API keys → copy `Publishable` and `Secret` keys. Paste:

   ```bash
   STRIPE_SECRET_KEY="sk_test_..."
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
   ```

3. Create two Prices in Stripe Dashboard → Products:
   - "Tessera Pro" — $24/mo recurring
   - "Tessera Team" — $94/seat/mo recurring (per-unit billing)

   Copy the Price IDs and add to `.env.local`:

   ```bash
   STRIPE_PRICE_ID_PRO="price_..."
   STRIPE_PRICE_ID_TEAM="price_..."
   ```

4. For local webhook testing, install the [Stripe CLI](https://stripe.com/docs/stripe-cli):

   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

   The CLI prints a `Webhook signing secret`. Add it to `.env.local`:

   ```bash
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

5. Restart `npm run dev` AND leave `stripe listen` running.

To test the full flow: go to `/demo-inc/billing`, click "Switch to Pro", complete the Stripe Checkout with test card `4242 4242 4242 4242`. The webhook fires; the org's plan flips to `pro` in the DB.

### Resend (email)

1. Sign up at [resend.com](https://resend.com). Free tier: 100 emails/day.
2. Dashboard → API Keys → create a key with "Sending access" permission. Paste:

   ```bash
   RESEND_API_KEY="re_..."
   RESEND_FROM_EMAIL="onboarding@resend.dev"
   ```

3. For production, [verify your own domain](https://resend.com/docs/dashboard/domains/introduction) and change `RESEND_FROM_EMAIL` to a verified address.

4. Restart `npm run dev`.

To test: submit a new feedback post on the public board. The admin user should receive an email within ~5 seconds.

### Sentry (errors — optional)

1. Sign up at [sentry.io](https://sentry.io). Free tier: 5k errors/month.
2. Create a Next.js project. Copy the DSN.
3. Add to `.env.local`:

   ```bash
   NEXT_PUBLIC_SENTRY_DSN="https://...@sentry.io/..."
   ```

Tessera doesn't ship with Sentry instrumentation by default — adding it is a `npx @sentry/wizard@latest -i nextjs` away. The DSN is plumbed through `.env.example` so it's a one-step add when you want it.

---

## Verifying real mode

Once you've set `DEMO_MODE=false` and added real keys, run:

```bash
npm run dev
```

You should see in the console:

```
[next] ready - started server on 0.0.0.0:3000
```

…with no warnings about missing keys. Visit `/` — the homepage's "Mode" line should read `DEMO_MODE=false (real)`.

Try the sign-up flow at `/sign-in`. You should land on Clerk's hosted sign-in UI (rather than Tessera's auto-signed-in dashboard).

---

## Deploying

### Vercel (recommended)

1. Push your fork to GitHub.
2. [Import the repo](https://vercel.com/new) in Vercel.
3. Add the env vars from your `.env.local` to Vercel → Project Settings → Environment Variables. Mark each as either "Production", "Preview", or both.
4. Update the Stripe webhook URL in Stripe Dashboard to point at `https://your-app.vercel.app/api/webhooks/stripe`. Copy the new signing secret and update `STRIPE_WEBHOOK_SECRET` in Vercel.
5. Update Clerk → Configure → Domains → add your Vercel production domain.

First deploy takes ~3 minutes. Subsequent deploys are <1 minute.

### Other platforms

Tessera is a standard Next.js app — Railway, Fly.io, Render, and self-hosted Docker all work. The only platform-specific config is `vercel.json` (none committed today, so any platform is on equal footing).

For Docker:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json prisma ./
RUN npm ci --omit=dev
COPY . .
RUN npx prisma generate && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

(This Dockerfile is not committed — Tessera defaults to Vercel because most readers will. PR welcome if you'd like the Docker path supported officially.)

---

## Troubleshooting

### "Database is unreachable" on the homepage

The `/` page tries to query Postgres for a health check. Reachable = green; otherwise red.

```bash
# Verify Docker is running
docker compose ps

# Should show the codira-demo-postgres container as "healthy".
# If not:
docker compose down
docker compose up -d

# Wait ~5 seconds, refresh /
```

If you're using Neon/Supabase, double-check the connection string in `.env.local` and that you've added `?sslmode=require` for managed Postgres.

### "Seed data is empty" on the homepage

```bash
npm run db:seed
```

You should see:

```
Seed complete — 1 org, 3 users, 2 projects, 5 tasks, 8 customers, 14 posts, ~50 votes, 4 comments.
```

If the seed errors with a Prisma constraint message, your DB likely has partial data from a failed previous run. Reset:

```bash
npm run db:reset
```

### "User row missing — did you run db:seed?"

This is the demo mode auth check throwing when the seeded `demo_user_codira` row doesn't exist. Re-run the seed:

```bash
npm run db:seed
```

### Codira's first-steps card doesn't appear

The Phase 2 scanner needs an AI provider configured to call the planner. Open Codira's Settings (`⌘,`) → API Keys → paste an OpenAI or Anthropic key.

The card lands within ~15 seconds after the scanner completes.

### Type errors break the build

`npm run build` should succeed despite the demo errors in `src/lib/demo-errors.ts` — `next.config.mjs` sets `typescript.ignoreBuildErrors: true` to allow this.

If your build fails on type errors anyway:

- Delete `src/lib/demo-errors.ts` (recommended when forking)
- OR set `ignoreBuildErrors: true` if you accidentally removed it from the config

### Stripe webhook returns 400 in dev

Make sure `stripe listen` is running AND that `STRIPE_WEBHOOK_SECRET` in `.env.local` matches what the CLI printed. Each `stripe listen` invocation generates a fresh signing secret — copy the latest one.

### Cookie not persisting on the public board

The `tessera_customer_email` cookie is `httpOnly + sameSite=lax`. Browsers respect those even in dev. If you're testing in an embed iframe across origins, third-party cookie restrictions kick in — Chrome's "third-party cookies blocked" setting will prevent the embed from voting. The host-page experience is unaffected.

---

## Getting help

- **Bug in Tessera?** [Open an issue](https://github.com/Codira-AI/demo/issues)
- **Bug in Codira?** [Open an issue at codira/codira](https://github.com/BryanFerre/codira/issues)
- **Question about the tour?** [hello@codira.dev](mailto:hello@codira.dev)
