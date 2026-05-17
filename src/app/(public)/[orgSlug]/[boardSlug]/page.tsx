/**
 * Public feedback board.
 *
 * Resolves /[orgSlug]/[boardSlug] when boardSlug doesn't match one
 * of the reserved authed paths (dashboard, projects, tasks,
 * feedback, billing). Next.js prefers literal segments, so collisions
 * are impossible — but we keep RESERVED_BOARD_SLUGS as a defensive
 * check so a future project named literally `dashboard` doesn't
 * accidentally render here.
 *
 * Privacy boundary: the project's `is_public` flag. Private
 * projects 404 even when the URL is correct.
 */

import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { BoardContent } from '@/components/BoardContent';

/** Slugs that authed routes use — a project with one of these
 *  slugs should never reach this page in practice (Next.js routing
 *  prefers literal segments), but if it ever did we 404 to avoid
 *  ambiguity. Same list as the authed page directory names. */
const RESERVED_BOARD_SLUGS = new Set([
  'dashboard',
  'projects',
  'tasks',
  'feedback',
  'billing',
  'sign-in',
  'sign-up',
]);

export default async function PublicBoardPage({
  params,
}: {
  params: Promise<{ orgSlug: string; boardSlug: string }>;
}) {
  const { orgSlug, boardSlug } = await params;

  if (RESERVED_BOARD_SLUGS.has(boardSlug)) notFound();

  // Single query gets org + project. Org slug → org id → project lookup
  // happens in one round-trip via the relation. Returns null when the
  // org or board doesn't exist OR when the board isn't public.
  const board = await db.project.findFirst({
    where: {
      slug: boardSlug,
      is_public: true,
      organization: { slug: orgSlug },
    },
    include: {
      organization: { select: { name: true, slug: true } },
    },
  });
  if (!board) notFound();

  const posts = await db.feedbackPost.findMany({
    where: { project_id: board.id },
    include: {
      customer: { select: { name: true, email: true } },
      _count: { select: { votes: true, comments: true } },
    },
    // Most-voted first, then most-recent — the canonical "popular"
    // ordering for feedback boards.
    orderBy: [{ votes: { _count: 'desc' } }, { created_at: 'desc' }],
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6 border-b border-edge pb-4">
        <div className="text-xs uppercase tracking-wider text-ink-2">
          {board.organization.name}
        </div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{board.name}</h1>
        {board.description && (
          <p className="mt-2 text-sm text-ink-2">{board.description}</p>
        )}
        <div className="mt-3 text-xs text-ink-2">
          {posts.length} post{posts.length === 1 ? '' : 's'} ·{' '}
          <a
            href={`/api/embed.js?board=${orgSlug}/${boardSlug}`}
            className="text-accent hover:underline"
            title="Copy this URL to embed the board in your own app"
          >
            embed this board ↗
          </a>
        </div>
      </header>

      <BoardContent posts={posts} />
    </div>
  );
}
