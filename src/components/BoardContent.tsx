/**
 * Shared content block for both the public board page and the
 * embedded widget. Owns:
 *
 *   - Post list, sorted by vote count desc then created_at desc
 *   - Status filter chips
 *   - Vote button (currently inert — Day 3A wires the server action)
 *   - "Submit a post" form (currently inert — same)
 *
 * Pure presentational at the moment. The page that renders this
 * does the DB query and passes a flat list of posts; this component
 * doesn't read anything from server context, which means the embed
 * widget can reuse it without leaking authed data.
 */

import { ChevronUp, MessageSquare } from 'lucide-react';
import { StatusPill } from './StatusPills';
import { formatRelativeTime } from '@/lib/format';
import type { PostStatus } from '@prisma/client';

export type BoardPost = {
  id: string;
  title: string;
  body: string | null;
  status: PostStatus;
  created_at: Date;
  customer: { name: string | null; email: string };
  _count: { votes: number; comments: number };
};

export function BoardContent({
  posts,
  showSubmit = true,
}: {
  posts: BoardPost[];
  showSubmit?: boolean;
}) {
  return (
    <div className="space-y-4">
      {showSubmit && <SubmitForm />}

      {posts.length === 0 ? (
        <div className="rounded-lg border border-edge bg-bg-1 p-8 text-center">
          <MessageSquare size={28} className="mx-auto mb-2 text-ink-2" />
          <p className="text-sm text-ink-1">No posts yet.</p>
          <p className="mt-1 text-xs text-ink-2">
            Be the first to share what you'd like to see built.
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-edge bg-bg-1">
          {posts.map((post) => (
            <li
              key={post.id}
              id={`post-${post.id}`}
              className="flex items-start gap-3 border-b border-edge p-4 last:border-b-0"
            >
              <VoteButton count={post._count.votes} />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-ink-0">{post.title}</h3>
                  <StatusPill status={post.status} />
                </div>
                {post.body && (
                  <p className="mb-2 text-sm text-ink-1">{post.body}</p>
                )}
                <div className="flex items-center gap-3 text-2xs text-ink-2">
                  <span>{post.customer.name ?? post.customer.email}</span>
                  <span>·</span>
                  <span>{formatRelativeTime(post.created_at)}</span>
                  {post._count.comments > 0 && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5">
                        <MessageSquare size={11} />
                        {post._count.comments}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Vote button — visual only in Day 2C. The server action that
 *  actually records a vote lands in Day 3A. The disabled style
 *  prevents users from clicking-and-being-confused-by-silence. */
function VoteButton({ count }: { count: number }) {
  return (
    <button
      type="button"
      disabled
      title="Voting will be wired up in Day 3A — meanwhile, take Codira's tour to see how the agent team builds it."
      className="flex w-14 shrink-0 cursor-not-allowed flex-col items-center rounded border border-edge bg-bg-0 py-1.5 text-xs opacity-70"
    >
      <ChevronUp size={14} className="text-ink-2" />
      <span className="font-semibold text-ink-0">{count}</span>
    </button>
  );
}

/** Submit form — visual only in Day 2C. Replaced by a real server
 *  action in Day 3A with optimistic UI + zod validation. */
function SubmitForm() {
  return (
    <form className="rounded-lg border border-edge bg-bg-1 p-4 opacity-90">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-2">
        Submit feedback
      </label>
      <input
        type="text"
        placeholder="Short title (e.g. 'Dark mode for the dashboard')"
        disabled
        className="mb-2 w-full rounded border border-edge bg-bg-0 px-3 py-2 text-sm text-ink-0 placeholder:text-ink-2"
      />
      <textarea
        placeholder="More detail (optional)"
        disabled
        rows={2}
        className="mb-2 w-full rounded border border-edge bg-bg-0 px-3 py-2 text-sm text-ink-0 placeholder:text-ink-2"
      />
      <div className="flex items-center justify-between">
        <p className="text-2xs text-ink-2">
          Submissions land in Day 3A — see the tour script.
        </p>
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded bg-accent px-3 py-1 text-xs font-semibold text-white opacity-50"
        >
          Submit
        </button>
      </div>
    </form>
  );
}
