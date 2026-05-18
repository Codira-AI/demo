/**
 * Shared content block for both the public board page and the
 * embedded widget. Owns:
 *
 *   - Post list, sorted by vote count desc then created_at desc
 *   - Vote button (form-action wired to voteOnPost when identified)
 *   - "Submit a post" form (form-action wired to submitFeedbackPost
 *     when identified)
 *
 * Identity comes in as `customerEmail` (read from cookie by the
 * server-component page). When null, vote / submit show "identify
 * yourself first" disabled state instead of being interactive.
 */

import { ChevronUp, MessageSquare } from 'lucide-react';
import { StatusPill } from './StatusPills';
import { formatRelativeTime } from '@/lib/format';
import { voteOnPost, submitFeedbackPost } from '@/lib/actions/posts';
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
  orgSlug,
  boardSlug,
  customerEmail,
  showSubmit = true,
}: {
  posts: BoardPost[];
  orgSlug: string;
  boardSlug: string;
  customerEmail: string | null;
  showSubmit?: boolean;
}) {
  const interactive = customerEmail !== null;

  return (
    <div className="space-y-4">
      {showSubmit && interactive && (
        <SubmitForm orgSlug={orgSlug} boardSlug={boardSlug} />
      )}

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
              <VoteButton
                post={post}
                orgSlug={orgSlug}
                boardSlug={boardSlug}
                interactive={interactive}
              />
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

/** Vote button. Form-action when interactive; disabled-with-tooltip
 *  when there's no customer identity (the page above prompts the
 *  user to identify, which sets the cookie + re-renders). */
function VoteButton({
  post,
  orgSlug,
  boardSlug,
  interactive,
}: {
  post: BoardPost;
  orgSlug: string;
  boardSlug: string;
  interactive: boolean;
}) {
  if (!interactive) {
    return (
      <button
        type="button"
        disabled
        title="Identify yourself above to vote."
        className="flex w-14 shrink-0 cursor-not-allowed flex-col items-center rounded border border-edge bg-bg-0 py-1.5 text-xs opacity-70"
      >
        <ChevronUp size={14} className="text-ink-2" />
        <span className="font-semibold text-ink-0">{post._count.votes}</span>
      </button>
    );
  }

  return (
    <form action={voteOnPost}>
      <input type="hidden" name="postId" value={post.id} />
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="boardSlug" value={boardSlug} />
      <button
        type="submit"
        className="flex w-14 shrink-0 flex-col items-center rounded border border-edge bg-bg-0 py-1.5 text-xs transition-colors hover:border-accent hover:bg-accent/5"
        title="Upvote — one per email per post"
      >
        <ChevronUp size={14} className="text-accent" />
        <span className="font-semibold text-ink-0">{post._count.votes}</span>
      </button>
    </form>
  );
}

/** Submit form. Only rendered when interactive=true (the parent
 *  also gates on showSubmit). Resets to empty on each render — the
 *  page revalidates after submission so a successful post becomes
 *  the new top-of-list. */
function SubmitForm({
  orgSlug,
  boardSlug,
}: {
  orgSlug: string;
  boardSlug: string;
}) {
  return (
    <form action={submitFeedbackPost} className="rounded-lg border border-edge bg-bg-1 p-4">
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-2">
        Submit feedback
      </label>
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="boardSlug" value={boardSlug} />
      <input
        type="text"
        name="title"
        required
        minLength={3}
        maxLength={120}
        placeholder="Short title (e.g. 'Dark mode for the dashboard')"
        className="mb-2 w-full rounded border border-edge bg-bg-0 px-3 py-2 text-sm text-ink-0 placeholder:text-ink-2"
      />
      <textarea
        name="body"
        maxLength={2000}
        rows={2}
        placeholder="More detail (optional)"
        className="mb-2 w-full rounded border border-edge bg-bg-0 px-3 py-2 text-sm text-ink-0 placeholder:text-ink-2"
      />
      <div className="flex items-center justify-end">
        <button
          type="submit"
          className="rounded bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent/90"
        >
          Submit
        </button>
      </div>
    </form>
  );
}
