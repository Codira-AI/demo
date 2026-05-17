/**
 * Admin feedback view — every customer feedback post across every
 * project in the org. Sortable client-side; for v1 the server
 * returns them newest-first and we render a flat list.
 *
 * Filter chips at the top let the user narrow by status. We
 * implement this with URL search params (?status=open) so deep-
 * linking to "all open feedback" works. The chip set is a small
 * client component that swaps the URL.
 */

import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { requireOrgAccess } from '@/lib/auth';
import { feedbackForOrg } from '@/lib/tenant';
import { StatusPill } from '@/components/StatusPills';
import { formatRelativeTime } from '@/lib/format';
import { FeedbackStatusChips } from './FeedbackStatusChips';
import type { PostStatus } from '@prisma/client';

const ALL_STATUSES: PostStatus[] = ['open', 'planned', 'in_progress', 'completed', 'declined'];

export default async function FeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { orgSlug } = await params;
  const { status: statusFilter } = await searchParams;
  const { organization } = await requireOrgAccess(orgSlug);

  const all = await feedbackForOrg(organization);
  const filtered = statusFilter
    ? all.filter((p) => p.status === statusFilter)
    : all;

  // Count per status so the chips show "(N)" badges.
  const counts: Record<PostStatus, number> = {
    open: 0,
    planned: 0,
    in_progress: 0,
    completed: 0,
    declined: 0,
  };
  for (const p of all) counts[p.status]++;

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Customer feedback</h1>
        <p className="mt-1 text-sm text-ink-2">
          {all.length} total · {filtered.length} {statusFilter ? `${statusFilter.replace(/_/g, ' ')}` : 'shown'}
        </p>
      </header>

      <FeedbackStatusChips
        orgSlug={orgSlug}
        counts={counts}
        active={statusFilter ?? null}
        statuses={ALL_STATUSES}
      />

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-edge bg-bg-1 p-12 text-center">
          <MessageSquare size={32} className="mx-auto mb-3 text-ink-2" />
          <h2 className="text-sm font-medium text-ink-0">
            {statusFilter ? `No ${statusFilter.replace(/_/g, ' ')} feedback` : 'No feedback yet'}
          </h2>
          <p className="mt-1 text-xs text-ink-2">
            {statusFilter
              ? `Try clearing the filter or switching to another status.`
              : `Once customers post on your public boards, their feedback shows up here.`}
          </p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-edge bg-bg-1">
          {filtered.map((post) => (
            <li key={post.id} className="border-b border-edge last:border-b-0">
              <Link
                href={`/${orgSlug}/${post.project.slug}#post-${post.id}`}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-bg-2"
              >
                <StatusPill status={post.status} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink-0">
                    {post.title}
                  </div>
                  {post.body && (
                    <div className="mt-0.5 line-clamp-2 text-xs text-ink-2">
                      {post.body}
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-2xs text-ink-2">
                    <span className="text-accent">{post.project.name}</span>
                    <span>·</span>
                    <span>{post.customer.name ?? post.customer.email}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(post.created_at)}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs text-ink-2">
                  <div>{post._count.votes} vote{post._count.votes === 1 ? '' : 's'}</div>
                  <div className="mt-0.5">
                    {post._count.comments} comment{post._count.comments === 1 ? '' : 's'}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
