/**
 * Status-filter chips for the feedback page.
 *
 * Pure client component — it just swaps the URL search param.
 * Server component above reads the param and re-renders with the
 * filter applied. No client-side state needed beyond what's in
 * the URL.
 */

'use client';

import Link from 'next/link';
import clsx from 'clsx';
import type { PostStatus } from '@prisma/client';

export function FeedbackStatusChips({
  orgSlug,
  statuses,
  counts,
  active,
}: {
  orgSlug: string;
  statuses: PostStatus[];
  counts: Record<PostStatus, number>;
  active: string | null;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      <ChipLink
        href={`/${orgSlug}/feedback`}
        label="All"
        active={active === null}
      />
      {statuses.map((status) => (
        <ChipLink
          key={status}
          href={`/${orgSlug}/feedback?status=${status}`}
          label={`${status.replace(/_/g, ' ')} (${counts[status]})`}
          active={active === status}
        />
      ))}
    </div>
  );
}

function ChipLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs capitalize transition-colors',
        active
          ? 'border-accent bg-accent text-white'
          : 'border-edge bg-bg-1 text-ink-1 hover:bg-bg-2 hover:text-ink-0',
      )}
    >
      {label}
    </Link>
  );
}
