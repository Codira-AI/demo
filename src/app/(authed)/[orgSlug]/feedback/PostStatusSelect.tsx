/**
 * Admin status-change select for a feedback post.
 *
 * Renders inside the feedback list row. Form-action posts to
 * updatePostStatus which:
 *   - re-checks org admin
 *   - skips the write when status is unchanged
 *   - fires the customer notification email (mocked in demo)
 *   - revalidates the affected paths
 *
 * Lives as a separate small client component so we can use a JS-
 * driven form.submit() onChange (rather than requiring the user to
 * click an explicit Save button after picking a new status).
 */

'use client';

import { useRef } from 'react';
import { updatePostStatus } from '@/lib/actions/posts';
import type { PostStatus } from '@prisma/client';

const STATUSES: PostStatus[] = [
  'open',
  'planned',
  'in_progress',
  'completed',
  'declined',
];

export function PostStatusSelect({
  postId,
  orgSlug,
  current,
}: {
  postId: string;
  orgSlug: string;
  current: PostStatus;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <form action={updatePostStatus} ref={formRef}>
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <select
        name="newStatus"
        defaultValue={current}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded border border-edge bg-bg-0 px-2 py-1 text-2xs text-ink-1 hover:border-accent focus:border-accent focus:outline-none"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
    </form>
  );
}
