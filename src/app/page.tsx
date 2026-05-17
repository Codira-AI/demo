import Link from 'next/link';
import { db } from '@/lib/db';
import { isDemoMode } from '@/lib/demo';

/**
 * Landing page.
 *
 * In demo mode, this auto-redirects context to the seeded "Demo Inc."
 * org dashboard so a fresh `npm run dev` shows real UI immediately
 * instead of an empty marketing page. Production deployments would
 * replace this with a real marketing site; the demo skips that
 * layer because Tessera is a tool, not a homepage tutorial.
 */
export default async function Home() {
  // Quick health check — confirm the database is reachable so the
  // first impression isn't a stack trace when someone forgot to
  // run `docker compose up -d`. Counts are cheap and informative.
  const counts = await db.$transaction([
    db.organization.count(),
    db.project.count(),
    db.feedbackPost.count(),
    db.customer.count(),
  ]).catch(() => null);

  const dbReachable = counts !== null;
  const seeded = dbReachable && counts![0] > 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12">
      <header className="border-b border-edge pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Tessera</h1>
        <p className="mt-1 text-sm text-ink-2">
          Project management + customer feedback for indie SaaS makers.
        </p>
      </header>

      <section className="rounded-lg border border-edge bg-bg-1 p-4">
        <div className="mb-2 text-xs uppercase tracking-wider text-ink-2">
          Demo status
        </div>
        <ul className="space-y-1 text-sm">
          <li>
            <span className="inline-block w-32 text-ink-2">Mode:</span>
            <span className="font-mono">
              {isDemoMode() ? 'DEMO_MODE=true (mocked)' : 'DEMO_MODE=false (real)'}
            </span>
          </li>
          <li>
            <span className="inline-block w-32 text-ink-2">Database:</span>
            <span className={dbReachable ? 'text-accent' : 'text-red-500'}>
              {dbReachable ? 'connected' : 'unreachable — did docker compose up?'}
            </span>
          </li>
          {dbReachable && (
            <li>
              <span className="inline-block w-32 text-ink-2">Seed data:</span>
              <span className={seeded ? 'text-accent' : 'text-ink-2'}>
                {seeded
                  ? `${counts![0]} org, ${counts![1]} projects, ${counts![2]} posts, ${counts![3]} customers`
                  : 'empty — run `npm run db:seed`'}
              </span>
            </li>
          )}
        </ul>
      </section>

      {seeded && (
        <nav className="flex flex-col gap-2">
          <Link
            href="/demo-inc/dashboard"
            className="rounded-lg border border-accent bg-accent px-4 py-3 text-center text-sm font-semibold text-white hover:bg-accent/90"
          >
            Open team dashboard →
          </Link>
          <Link
            href="/demo-inc/ship-tracker"
            className="rounded-lg border border-edge bg-bg-1 px-4 py-3 text-center text-sm text-ink-1 hover:bg-bg-2 hover:text-ink-0"
          >
            View public feedback board (Ship Tracker)
          </Link>
        </nav>
      )}

      <footer className="mt-auto border-t border-edge pt-4 text-xs text-ink-2">
        Built with{' '}
        <a
          href="https://codira.dev"
          className="text-accent hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Codira
        </a>
        . Source:{' '}
        <a
          href="https://github.com/codira/demo"
          className="text-accent hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          github.com/codira/demo
        </a>
      </footer>
    </main>
  );
}
