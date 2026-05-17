/**
 * Projects list. One row per project with quick stats inline:
 *   - public/private badge
 *   - task count
 *   - feedback count
 *
 * "New project" button up top is wired to the server action in
 * Day 3A; until then it's a placeholder link.
 *
 * CODIRA_DEMO: planner
 *
 * The ProjectFilter component referenced below is intentionally
 * absent. Run this prompt in the chat panel to have the planner +
 * implementer build it for you:
 *
 *   /plan add a ProjectFilter component that filters this list
 *   by visibility (all / public / private) and by name search.
 *   Use server actions for the filter state (URL search params).
 *
 * Codira reads the Architect doc and respects your stack — it'll
 * use Tailwind + Next.js patterns matching what's already here.
 */

import Link from 'next/link';
import { Plus, FolderKanban, Globe, Lock } from 'lucide-react';
import { requireOrgAccess } from '@/lib/auth';
import { db } from '@/lib/db';
// CODIRA_DEMO: planner — the line below intentionally has no import
// for ProjectFilter. The component doesn't exist yet. Ask the planner
// to build it (see the prompt in the file header).

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { organization } = await requireOrgAccess(orgSlug);

  // Hand-rolled query because we want the per-project counts in a
  // single round-trip. The tenant helper returns just rows; here
  // we also want _count.
  const projects = await db.project.findMany({
    where: { organization_id: organization.id },
    include: {
      _count: { select: { tasks: true, feedback_posts: true } },
    },
    orderBy: { created_at: 'asc' },
  });

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-ink-2">
            {projects.length} project{projects.length === 1 ? '' : 's'} in{' '}
            {organization.name}
          </p>
        </div>
        <Link
          href={`/${orgSlug}/projects/new`}
          className="inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent/90"
        >
          <Plus size={14} />
          New project
        </Link>
      </header>

      {/* TODO: ProjectFilter goes here — see file header CODIRA_DEMO note. */}

      {projects.length === 0 ? (
        <EmptyState orgSlug={orgSlug} />
      ) : (
        <ul className="overflow-hidden rounded-lg border border-edge bg-bg-1">
          {projects.map((project) => (
            <li
              key={project.id}
              className="border-b border-edge last:border-b-0"
            >
              <Link
                href={`/${orgSlug}/projects/${project.slug}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-2"
              >
                <FolderKanban size={16} className="shrink-0 text-ink-2" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink-0">
                      {project.name}
                    </span>
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
                    <div className="mt-0.5 truncate text-xs text-ink-2">
                      {project.description}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-xs text-ink-2">
                  {project._count.tasks} task{project._count.tasks === 1 ? '' : 's'} ·{' '}
                  {project._count.feedback_posts} post
                  {project._count.feedback_posts === 1 ? '' : 's'}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ orgSlug }: { orgSlug: string }) {
  return (
    <div className="rounded-lg border border-edge bg-bg-1 p-12 text-center">
      <FolderKanban size={32} className="mx-auto mb-3 text-ink-2" />
      <h2 className="text-sm font-medium text-ink-0">No projects yet</h2>
      <p className="mt-1 text-xs text-ink-2">
        Projects group tasks and customer feedback for a single product or initiative.
      </p>
      <Link
        href={`/${orgSlug}/projects/new`}
        className="mt-4 inline-flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent/90"
      >
        <Plus size={12} />
        Create your first project
      </Link>
    </div>
  );
}
