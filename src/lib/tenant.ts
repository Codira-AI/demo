/**
 * Multi-tenant query helpers.
 *
 * Every authed read/mutation in Tessera scopes to a single
 * Organization. These helpers wrap the Prisma client with that
 * scoping baked in, so a server action that forgets the
 * organization_id filter can't accidentally leak rows from
 * another tenant.
 *
 * The pattern: get the org from requireSession(), pass it into
 * one of these helpers, work with the scoped result. Page code
 * never reads `Project` etc. without going through a helper that
 * scopes to the current org.
 *
 * The helpers are deliberately small — they're not an ORM-on-top-
 * of-an-ORM, just guard-rails. You can always drop down to `db.*`
 * directly when you need to (just don't forget the scoping).
 */

import { db } from './db';
import type { Organization } from '@prisma/client';

/** All projects in an org. */
export async function projectsForOrg(org: Organization) {
  return db.project.findMany({
    where: { organization_id: org.id },
    orderBy: { created_at: 'asc' },
  });
}

/** A single project by slug, scoped to org. Returns null when the
 *  slug doesn't exist OR when it belongs to a different org — same
 *  signal because we don't want to leak existence info across
 *  tenants. */
export async function projectBySlug(org: Organization, slug: string) {
  return db.project.findUnique({
    where: { organization_id_slug: { organization_id: org.id, slug } },
  });
}

/** All tasks across an org's projects. Joins through project for
 *  the scoping check. */
export async function tasksForOrg(org: Organization) {
  return db.task.findMany({
    where: { project: { organization_id: org.id } },
    include: { assignees: true, project: { select: { name: true, slug: true } } },
    orderBy: [{ priority: 'desc' }, { created_at: 'asc' }],
  });
}

/** All feedback posts across an org's public projects. */
export async function feedbackForOrg(org: Organization) {
  return db.feedbackPost.findMany({
    where: { project: { organization_id: org.id } },
    include: {
      customer: { select: { name: true, email: true } },
      project: { select: { name: true, slug: true } },
      _count: { select: { votes: true, comments: true } },
    },
    orderBy: { created_at: 'desc' },
  });
}

/** Counts for the org dashboard summary tiles. */
export async function dashboardCountsForOrg(org: Organization) {
  const [projects, openTasks, openPosts] = await db.$transaction([
    db.project.count({ where: { organization_id: org.id } }),
    db.task.count({
      where: {
        project: { organization_id: org.id },
        status: { in: ['todo', 'in_progress', 'in_review'] },
      },
    }),
    db.feedbackPost.count({
      where: {
        project: { organization_id: org.id },
        status: { in: ['open', 'planned', 'in_progress'] },
      },
    }),
  ]);
  return { projects, openTasks, openPosts };
}
