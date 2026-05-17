/**
 * Tasks list — all tasks across all projects in the org, grouped
 * by status. The group order matches the natural workflow: todo
 * first, then in_progress, in_review, done.
 *
 * Each row links to its parent project. We don't have an individual
 * task page yet — tasks are short enough that the inline summary
 * here is sufficient until we add task-level commenting (future).
 */

import Link from 'next/link';
import { requireOrgAccess } from '@/lib/auth';
import { tasksForOrg } from '@/lib/tenant';
import { TaskStatusPill, PriorityPill } from '@/components/StatusPills';
import { formatDate } from '@/lib/format';
import type { TaskStatus } from '@prisma/client';

const GROUP_ORDER: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done'];

export default async function TasksPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { organization } = await requireOrgAccess(orgSlug);

  const tasks = await tasksForOrg(organization);
  // Group in a single pass so we keep the priority-then-created ordering
  // from the helper without re-sorting per group.
  const groups: Record<TaskStatus, typeof tasks> = {
    todo: [],
    in_progress: [],
    in_review: [],
    done: [],
  };
  for (const task of tasks) groups[task.status].push(task);

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="mt-1 text-sm text-ink-2">
          {tasks.length} task{tasks.length === 1 ? '' : 's'} across {organization.name}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {GROUP_ORDER.map((status) => (
          <Column key={status} status={status} tasks={groups[status]} orgSlug={orgSlug} />
        ))}
      </div>
    </div>
  );
}

function Column({
  status,
  tasks,
  orgSlug,
}: {
  status: TaskStatus;
  tasks: Array<{
    id: string;
    title: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    due_date: Date | null;
    project: { name: string; slug: string };
    assignees: Array<{ name: string | null; email: string }>;
  }>;
  orgSlug: string;
}) {
  return (
    <div className="rounded-lg border border-edge bg-bg-1 p-3">
      <div className="mb-2 flex items-center justify-between">
        <TaskStatusPill status={status} />
        <span className="text-xs text-ink-2">{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <div className="px-2 py-6 text-center text-xs text-ink-2">empty</div>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="rounded border border-edge bg-bg-0 p-2.5 text-xs"
            >
              <div className="mb-1 flex items-center justify-between">
                <PriorityPill priority={task.priority} />
                {task.due_date && (
                  <span className="text-2xs text-ink-2">
                    {formatDate(task.due_date)}
                  </span>
                )}
              </div>
              <div className="mb-1.5 text-sm text-ink-0">{task.title}</div>
              <Link
                href={`/${orgSlug}/projects/${task.project.slug}`}
                className="text-2xs text-ink-2 hover:text-accent"
              >
                {task.project.name} →
              </Link>
              {task.assignees.length > 0 && (
                <div className="mt-1 text-2xs text-ink-2">
                  {task.assignees.map((a) => a.name ?? a.email).join(', ')}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
