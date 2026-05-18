/**
 * Dashboard — top-of-funnel landing for authenticated users.
 *
 * Shows: three counter tiles (projects / open tasks / open feedback)
 * + a slice of recent activity (5 most recent feedback posts across
 * all projects in the org). Recent activity uses the feedbackForOrg
 * helper so the org-scoping is in one place.
 */

import Link from 'next/link';
import { requireOrgAccess } from '@/lib/auth';
import { dashboardCountsForOrg, feedbackForOrg } from '@/lib/tenant';
import { db } from '@/lib/db';
import { StatusPill } from '@/components/StatusPills';
import { formatRelativeTime } from '@/lib/format';
import { MetricBar } from './MetricBar';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { organization, user } = await requireOrgAccess(orgSlug);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [counts, recent, openFeedback, tasksInProgress, completedThisWeek] = await Promise.all([
    dashboardCountsForOrg(organization),
    feedbackForOrg(organization).then((all) => all.slice(0, 5)),
    db.feedbackPost.count({
      where: {
        project: { organization_id: organization.id },
        status: 'open',
      },
    }),
    db.task.count({
      where: {
        project: { organization_id: organization.id },
        status: 'in_progress',
      },
    }),
    db.task.count({
      where: {
        project: { organization_id: organization.id },
        status: 'done',
        // Tasks lack an updated_at field today; for the demo we
        // approximate "this week" by created_at. A real product
        // would track status_changed_at separately. (Flag this in
        // /plan to see Codira propose the schema change.)
        created_at: { gte: sevenDaysAgo },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {user.name?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="mt-1 text-sm text-ink-2">
          {organization.name} · {organization.plan} plan
        </p>
      </header>

      <section className="mb-6 grid grid-cols-3 gap-3">
        <CounterTile label="Projects" value={counts.projects} href={`/${orgSlug}/projects`} />
        <CounterTile label="Open tasks" value={counts.openTasks} href={`/${orgSlug}/tasks`} />
        <CounterTile label="Open feedback" value={counts.openPosts} href={`/${orgSlug}/feedback`} />
      </section>

      <section className="mb-8">
        <MetricBar
          openFeedback={openFeedback}
          tasksInProgress={tasksInProgress}
          completedThisWeek={completedThisWeek}
        />
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-2">
            Recent feedback
          </h2>
          <Link
            href={`/${orgSlug}/feedback`}
            className="text-xs text-accent hover:underline"
          >
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-lg border border-edge bg-bg-1 p-6 text-center text-sm text-ink-2">
            No customer feedback yet. Once your public boards have posts they'll appear here.
          </div>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-edge bg-bg-1">
            {recent.map((post) => (
              <li
                key={post.id}
                className="flex items-start gap-3 border-b border-edge px-4 py-3 last:border-b-0"
              >
                <StatusPill status={post.status} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-ink-0" title={post.title}>
                    {post.title}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-ink-2">
                    {post.project.name} · {post.customer.name ?? post.customer.email} ·{' '}
                    {formatRelativeTime(post.created_at)}
                  </div>
                </div>
                <div className="shrink-0 text-xs text-ink-2">
                  {post._count.votes} {post._count.votes === 1 ? 'vote' : 'votes'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CounterTile({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-edge bg-bg-1 p-4 transition-colors hover:border-accent hover:bg-bg-2"
    >
      <div className="text-xs uppercase tracking-wider text-ink-2">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-ink-0">{value}</div>
    </Link>
  );
}
