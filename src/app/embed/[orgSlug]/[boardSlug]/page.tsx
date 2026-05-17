/**
 * Embeddable widget — the same board content, no chrome.
 *
 * Loads on its own URL (/embed/[orgSlug]/[boardSlug]) inside an
 * iframe that the customer's site creates via /api/embed.js. Has
 * three differences from the public page (`(public)/.../page.tsx`):
 *
 *   1. No header / footer (rendered by the embed layout).
 *   2. Smaller "Submit" form (showSubmit=false in v1 to keep the
 *      iframe-vs-parent input focus story simple; cross-origin
 *      form submission is a Day 3+ topic).
 *   3. EmbedHeightSync mounts a postMessage broadcaster so the
 *      parent page can resize the iframe to fit content.
 */

import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { BoardContent } from '@/components/BoardContent';
import { EmbedHeightSync } from './EmbedHeightSync';

export default async function EmbedPage({
  params,
}: {
  params: Promise<{ orgSlug: string; boardSlug: string }>;
}) {
  const { orgSlug, boardSlug } = await params;

  // Same query as the public page; same privacy guard.
  const board = await db.project.findFirst({
    where: {
      slug: boardSlug,
      is_public: true,
      organization: { slug: orgSlug },
    },
    include: {
      organization: { select: { name: true } },
    },
  });
  if (!board) notFound();

  const posts = await db.feedbackPost.findMany({
    where: { project_id: board.id },
    include: {
      customer: { select: { name: true, email: true } },
      _count: { select: { votes: true, comments: true } },
    },
    orderBy: [{ votes: { _count: 'desc' } }, { created_at: 'desc' }],
  });

  return (
    <div className="px-4 py-3">
      <EmbedHeightSync />

      <div className="mb-3 border-b border-edge pb-2">
        <h2 className="text-base font-semibold tracking-tight text-ink-0">
          {board.name}
        </h2>
        {board.description && (
          <p className="mt-0.5 text-xs text-ink-2">{board.description}</p>
        )}
      </div>

      {/* Submit disabled inside embeds for v1 — see file header. */}
      <BoardContent posts={posts} showSubmit={false} />

      <div className="mt-3 text-center text-2xs text-ink-2">
        Powered by{' '}
        <a
          href={`/${orgSlug}/${boardSlug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          Tessera
        </a>
      </div>
    </div>
  );
}
