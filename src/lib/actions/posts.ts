/**
 * Server actions for feedback posts.
 *
 * Three actions:
 *   - identifyCustomer(email, name?)  — set the customer cookie
 *   - submitFeedbackPost(form)         — create a post on a public board
 *   - voteOnPost(form)                 — upvote a post
 *   - updatePostStatus(form)           — admin-only status change
 *
 * Public actions (submit + vote) identify the customer via the
 * tessera_customer_email cookie. Admin actions (status update)
 * use requireOrgAdmin().
 *
 * Validation is zod-based — typing the inputs once in the schema
 * gives both runtime validation and TypeScript types. Errors throw
 * with messages safe to surface in the UI.
 */

'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireOrgAdmin } from '@/lib/auth';
import {
  getCustomerEmail,
  setCustomerEmail,
} from '@/lib/customer-cookie';
import { sendEmail, renderNewPostEmail, renderStatusChangeEmail } from '@/lib/email';
import type { PostStatus } from '@prisma/client';

// ─── identify ────────────────────────────────────────────────────

const identifySchema = z.object({
  email: z.string().email('Please enter a valid email').max(255),
  name: z.string().trim().max(80).optional(),
  redirectTo: z.string().startsWith('/').optional(),
});

/** Set the customer cookie + create/find the Customer row. Idempotent
 *  on email — re-identifying with the same email is a no-op aside
 *  from refreshing the cookie. */
export async function identifyCustomer(formData: FormData): Promise<void> {
  const parsed = identifySchema.parse({
    email: formData.get('email'),
    name: formData.get('name') || undefined,
    redirectTo: formData.get('redirectTo') || undefined,
  });

  await db.customer.upsert({
    where: { email: parsed.email },
    create: { email: parsed.email, name: parsed.name ?? null },
    update: parsed.name ? { name: parsed.name } : {},
  });

  await setCustomerEmail(parsed.email);
  if (parsed.redirectTo) revalidatePath(parsed.redirectTo);
}

// ─── submit a post ──────────────────────────────────────────────

const submitSchema = z.object({
  orgSlug: z.string().min(1),
  boardSlug: z.string().min(1),
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120),
  body: z.string().trim().max(2000).optional(),
});

export async function submitFeedbackPost(formData: FormData): Promise<void> {
  const email = await getCustomerEmail();
  if (!email) {
    throw new Error('Identify yourself first — enter your email to post.');
  }

  const parsed = submitSchema.parse({
    orgSlug: formData.get('orgSlug'),
    boardSlug: formData.get('boardSlug'),
    title: formData.get('title'),
    body: formData.get('body') || undefined,
  });

  // Resolve board (must be public) + the cookied customer in one
  // round-trip each. Both lookups need to succeed or we throw.
  const [board, customer] = await Promise.all([
    db.project.findFirst({
      where: {
        slug: parsed.boardSlug,
        is_public: true,
        organization: { slug: parsed.orgSlug },
      },
      include: {
        organization: { include: { users: { where: { role: 'admin' } } } },
      },
    }),
    db.customer.findUnique({ where: { email } }),
  ]);

  if (!board) throw new Error('Board not found or is private');
  if (!customer) {
    // Customer cookie set but no DB row — rare but possible if the
    // DB was reset after the cookie was set. Recreate gracefully.
    await db.customer.create({ data: { email } });
    throw new Error('Please refresh and try again');
  }

  const post = await db.feedbackPost.create({
    data: {
      project_id: board.id,
      customer_id: customer.id,
      title: parsed.title,
      body: parsed.body ?? null,
      status: 'open',
    },
  });

  // Fire-and-forget email notification to admins. We don't await
  // because the user shouldn't wait for SMTP — and a failed send
  // shouldn't fail the post creation. In demo mode this logs to
  // console; in real mode it hits Resend.
  for (const admin of board.organization.users) {
    const tpl = renderNewPostEmail({
      ownerName: admin.name ?? 'there',
      projectName: board.name,
      postTitle: post.title,
      postBody: post.body,
      postUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/${parsed.orgSlug}/${parsed.boardSlug}#post-${post.id}`,
      customerName: customer.name,
      customerEmail: customer.email,
    });
    void sendEmail({ to: admin.email, ...tpl }).catch((e) => {
      console.warn('[submitFeedbackPost] email send failed', e);
    });
  }

  // Revalidate both the public board and the admin feedback page —
  // both render this post.
  revalidatePath(`/${parsed.orgSlug}/${parsed.boardSlug}`);
  revalidatePath(`/${parsed.orgSlug}/feedback`);
  revalidatePath(`/${parsed.orgSlug}/dashboard`);
}

// ─── vote on a post ─────────────────────────────────────────────

const voteSchema = z.object({
  postId: z.string().min(1),
  orgSlug: z.string().min(1),
  boardSlug: z.string().min(1),
});

export async function voteOnPost(formData: FormData): Promise<void> {
  const email = await getCustomerEmail();
  if (!email) throw new Error('Identify yourself first — enter your email to vote.');

  const parsed = voteSchema.parse({
    postId: formData.get('postId'),
    orgSlug: formData.get('orgSlug'),
    boardSlug: formData.get('boardSlug'),
  });

  const customer = await db.customer.findUnique({ where: { email } });
  if (!customer) throw new Error('Please refresh and try again');

  // The (post_id, customer_id) unique constraint handles double-vote
  // attempts at the DB layer. We catch the constraint violation and
  // treat it as a no-op success — the user's intent ("upvote") is
  // already represented in the data.
  try {
    await db.vote.create({
      data: { post_id: parsed.postId, customer_id: customer.id },
    });
  } catch (e) {
    // P2002 = unique constraint failure on Prisma — exactly the
    // "you already voted" case. Anything else re-throws.
    if (!isUniqueViolation(e)) throw e;
  }

  revalidatePath(`/${parsed.orgSlug}/${parsed.boardSlug}`);
  revalidatePath(`/embed/${parsed.orgSlug}/${parsed.boardSlug}`);
  revalidatePath(`/${parsed.orgSlug}/feedback`);
}

// ─── update post status (admin only) ────────────────────────────

const updateStatusSchema = z.object({
  postId: z.string().min(1),
  newStatus: z.enum(['open', 'planned', 'in_progress', 'completed', 'declined']),
  orgSlug: z.string().min(1),
});

export async function updatePostStatus(formData: FormData): Promise<void> {
  const { organization } = await requireOrgAdmin();
  const parsed = updateStatusSchema.parse({
    postId: formData.get('postId'),
    newStatus: formData.get('newStatus'),
    orgSlug: formData.get('orgSlug'),
  });
  if (organization.slug !== parsed.orgSlug) {
    throw new Error('org slug mismatch');
  }

  // Fetch the current state so we can:
  //   1. Verify the post belongs to this org (multi-tenant guard).
  //   2. Skip the email + write if status didn't actually change.
  const post = await db.feedbackPost.findFirst({
    where: { id: parsed.postId, project: { organization_id: organization.id } },
    include: {
      customer: { select: { email: true, name: true } },
      project: { select: { slug: true } },
    },
  });
  if (!post) throw new Error('Post not found in your organization');
  if (post.status === parsed.newStatus) return;

  await db.feedbackPost.update({
    where: { id: post.id },
    data: { status: parsed.newStatus as PostStatus },
  });

  // Notify the post's author. Fire-and-forget; same rationale as
  // the new-post notification above.
  const tpl = renderStatusChangeEmail({
    customerName: post.customer.name,
    postTitle: post.title,
    oldStatus: post.status,
    newStatus: parsed.newStatus,
    postUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/${parsed.orgSlug}/${post.project.slug}#post-${post.id}`,
  });
  void sendEmail({ to: post.customer.email, ...tpl }).catch((e) => {
    console.warn('[updatePostStatus] email send failed', e);
  });

  revalidatePath(`/${parsed.orgSlug}/feedback`);
  revalidatePath(`/${parsed.orgSlug}/${post.project.slug}`);
  revalidatePath(`/embed/${parsed.orgSlug}/${post.project.slug}`);
}

// ─── helpers ────────────────────────────────────────────────────

/** Detect Prisma's unique-constraint-violation code (P2002).
 *  Avoid importing Prisma.PrismaClientKnownRequestError because
 *  the import chain pulls a lot — duck-type the code field instead. */
function isUniqueViolation(err: unknown): boolean {
  return (
    !!err &&
    typeof err === 'object' &&
    'code' in err &&
    (err as { code: unknown }).code === 'P2002'
  );
}
