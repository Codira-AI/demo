/**
 * Project detail. Two sections: open tasks + recent feedback.
 *
 * Both sections cap at 10 items inline; full lists are at
 * /[orgSlug]/tasks and /[orgSlug]/feedback respectively (with the
 * project filter pre-applied via search params in a future iteration).
 *
 * 404 when the slug doesn't exist OR belongs to a different org.
 * `projectBySlug` does the org-scoped lookup so this page never
 * needs to think about tenant isolation.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Globe, Lock } from 'lucide-react';
import { requireOrgAccess } from '@/lib/auth';
import { projectBySlug } from '@/lib/tenant';
import { db } from '@/lib/db';
import { TaskStatusPill, PriorityPill, StatusPill } from '@/components/StatusPills';
import { formatRelativeTime } from '@/lib/format';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; slug: string }>;
}) {
  const { orgSlug, slug } = await params;
  const { organization } = await requireOrgAccess(orgSlug);
  const project = await projectBySlug(organization, slug);
  if (!project) notFound();

  const [openTasks, recentPosts] = await Promise.all([
    db.task.findMany({
      where: {
        project_id: project.id,
        status: { in: ['todo', 'in_progress', 'in_review'] },
      },
      include: { assignees: { select: { name: true, email: true } } },
      orderBy: [{ priority: 'desc' }, { created_at: 'asc' }],
      take: 10,
    }),
    db.feedbackPost.findMany({
      where: { project_id: project.id },
      include: {
        customer: { select: { name: true, email: true } },
        _count: { select: { votes: true, comments: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <Link
        href={`/${orgSlug}/projects`}
        className="text-xs text-ink-2 hover:text-ink-0"
      >
        ← Projects
      </Link>

      <header className="mt-2 mb-6 border-b border-edge pb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          {project.is_public ? (
            <span className="inline-flex items-center gap-1 rounded border border-edge bg-bg-2 px-1.5 py-0.5 text-2xs text-ink-2">
              <Globe size={10} />
              public
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded border border-edge bg-bg-2 px-1.5 py-0.5 text-2xs text-ink-2">
              <Lock size={10} />
              private
            </span>
          )}
        </div>
        {project.description && (
          <p className="mt-1 text-sm text-ink-2">{project.description}</p>
        )}
        {project.is_public && (
          <div className="mt-3 text-xs text-ink-2">
            Public board:{' '}
            <Link
              href={`/${orgSlug}/${project.slug}`}
              className="text-accent hover:underline"
            >
              /{orgSlug}/{project.slug}
            </Link>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-2">
              Open tasks
            </h2>
            <span className="text-xs text-ink-2">{openTasks.length}</span>
          </div>
          {openTasks.length === 0 ? (
            <div className="rounded-lg border border-edge bg-bg-1 p-4 text-center text-xs text-ink-2">
              All caught up.
            </div>
          ) : (
            <ul className="space-y-1">
              {openTasks.map((task) => (
                <li
                  key={task.id}
                  className="rounded border border-edge bg-bg-1 p-3 text-xs"
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    <TaskStatusPill status={task.status} />
                    <PriorityPill priority={task.priority} />
                  </div>
                  <div className="text-sm text-ink-0">{task.title}</div>
                  {task.assignees.length > 0 && (
                    <div className="mt-1 text-2xs text-ink-2">
                      {task.assignees.map((a) => a.name ?? a.email).join(', ')}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-2">
              Recent feedback
            </h2>
            <span className="text-xs text-ink-2">{recentPosts.length}</span>
          </div>
          {recentPosts.length === 0 ? (
            <div className="rounded-lg border border-edge bg-bg-1 p-4 text-center text-xs text-ink-2">
              No customer feedback yet.
            </div>
          ) : (
            <ul className="space-y-1">
              {recentPosts.map((post) => (
                <li
                  key={post.id}
                  className="rounded border border-edge bg-bg-1 p-3 text-xs"
                >
                  <div className="mb-1">
                    <StatusPill status={post.status} />
                  </div>
                  <div className="text-sm text-ink-0">{post.title}</div>
                  <div className="mt-1 flex items-center gap-2 text-2xs text-ink-2">
                    <span>{post.customer.name ?? post.customer.email}</span>
                    <span>·</span>
                    <span>
                      {post._count.votes} vote{post._count.votes === 1 ? '' : 's'}
                    </span>
                    <span>·</span>
                    <span>{formatRelativeTime(post.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
