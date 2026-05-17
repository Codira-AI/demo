/**
 * Status pill components for Tessera's two enum surfaces:
 *
 *   - PostStatus (open / planned / in_progress / completed / declined)
 *   - TaskStatus (todo / in_progress / in_review / done)
 *   - Priority (low / medium / high / urgent)
 *
 * Three named exports so callers pick the right one for their data
 * type — no string-typed "kind" prop, just static dispatch via the
 * import.
 *
 * Visual style: small pill with a color matched to the status's
 * meaning. Open/Todo = neutral, In-progress = blue, Done/Completed
 * = green, Declined = red, etc.
 */

import clsx from 'clsx';
import type { PostStatus, TaskStatus, Priority } from '@prisma/client';

const POST_COLORS: Record<PostStatus, string> = {
  open: 'border-edge bg-bg-2 text-ink-1',
  planned: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300',
  in_progress: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300',
  completed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  declined: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300',
};

const TASK_COLORS: Record<TaskStatus, string> = {
  todo: 'border-edge bg-bg-2 text-ink-1',
  in_progress: 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300',
  in_review: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300',
  done: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'border-edge bg-bg-2 text-ink-2',
  medium: 'border-edge bg-bg-2 text-ink-1',
  high: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300',
  urgent: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300',
};

export function StatusPill({ status }: { status: PostStatus }) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wider',
        POST_COLORS[status],
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function TaskStatusPill({ status }: { status: TaskStatus }) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wider',
        TASK_COLORS[status],
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function PriorityPill({ priority }: { priority: Priority }) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wider',
        PRIORITY_COLORS[priority],
      )}
    >
      {priority}
    </span>
  );
}
