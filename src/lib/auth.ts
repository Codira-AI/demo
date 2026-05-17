/**
 * Auth public API.
 *
 * Every server component, server action, and API route imports from
 * this file — never directly from @clerk/nextjs. That indirection
 * lets us swap to the mock identity in DEMO_MODE without touching
 * any call sites.
 *
 * Three primitives:
 *   getSessionContext()  — { clerkUserId, clerkOrgId } | null
 *   requireSession()      — same, plus resolves to our DB User row.
 *                           Redirects to /sign-in if not authenticated.
 *   requireOrgAccess()    — convenience: throws if the resolved user
 *                           doesn't belong to the org they're trying
 *                           to access. Used in multi-tenant scoping.
 *
 * The real-mode branch lazily-imports @clerk/nextjs so DEMO_MODE
 * users don't need to bundle Clerk's React runtime if they only
 * ever run in demo mode. (Next.js does bundle Clerk into the server
 * runtime regardless, but the renderer-side cost is avoided.)
 */

import { redirect } from 'next/navigation';
import { db } from './db';
import { isDemoMode, DEMO_USER, DEMO_ORG } from './demo';
import { mockSession } from './auth-mock';
import type { Organization, User } from '@prisma/client';

export type SessionContext = {
  clerkUserId: string;
  clerkOrgId: string;
};

/** Read the current session without redirecting. Returns null when
 *  unauthenticated. Caller decides what to do. */
export async function getSessionContext(): Promise<SessionContext | null> {
  if (isDemoMode()) {
    return mockSession();
  }
  // Real Clerk path. Dynamic import keeps the demo-mode bundle slim.
  const { auth } = await import('@clerk/nextjs/server');
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return null;
  return { clerkUserId: userId, clerkOrgId: orgId };
}

/** Resolve the current session to a DB User row + their Organization.
 *  Redirects to /sign-in if unauthenticated. Throws if authenticated
 *  but the DB row is missing (a Clerk webhook race — should be rare
 *  and worth logging loudly). */
export async function requireSession(): Promise<{
  user: User;
  organization: Organization;
}> {
  const ctx = await getSessionContext();
  if (!ctx) {
    redirect('/sign-in');
  }

  // Demo mode guarantees the seed has created the row. Real mode
  // depends on the Clerk webhook handler having processed the
  // user-created event. If we ever see the missing-row case in
  // real mode, it's a webhook race and we throw so it's visible
  // in Sentry.
  const user = await db.user.findUnique({
    where: { clerk_user_id: ctx.clerkUserId },
    include: { organization: true },
  });
  if (!user) {
    if (isDemoMode()) {
      // The seed hasn't run. Tell the developer plainly instead of
      // crashing with a confusing Prisma error.
      throw new Error(
        'Demo mode: User row missing. Did you run `npm run db:seed`?',
      );
    }
    throw new Error(
      `Clerk user ${ctx.clerkUserId} authenticated but no DB row — webhook race?`,
    );
  }
  return { user, organization: user.organization };
}

/** CODIRA_DEMO: deletion-guard target
 *
 * Three near-identical helpers that wrap requireSession() with a
 * role / permission check. They're imported across the codebase
 * (server actions, API routes, page components) — try asking the
 * planner to "simplify" this file in the chat panel and watch
 * Codira's deletion guard catch the resulting damage before any
 * import sites break.
 *
 * Each helper is small but the variants exist for a reason:
 *   - requireOrgAdmin: only admin role can mutate org settings
 *   - requireOrgMember: any role can read most things
 *   - requireOrgOwner: future-proof — currently same as admin but
 *     reserved for the eventual "single owner per org" model
 */

export async function requireOrgAdmin() {
  const session = await requireSession();
  if (session.user.role !== 'admin') {
    throw new Error('Forbidden: admin role required');
  }
  return session;
}

export async function requireOrgMember() {
  // Any authenticated org member passes. We still hit requireSession
  // for the DB lookup so callers get the full user + organization.
  return requireSession();
}

export async function requireOrgOwner() {
  // Currently same as admin. When we add a true ownership model
  // (single owner per org, transfer-of-ownership flow) the gate
  // tightens here. Splitting now means call-sites don't need to
  // change later.
  const session = await requireSession();
  if (session.user.role !== 'admin') {
    throw new Error('Forbidden: owner role required');
  }
  return session;
}

/** Sanity-check that an org slug in a URL matches the authenticated
 *  org. Used by /[orgSlug]/* routes to prevent cross-tenant URL
 *  manipulation. */
export async function requireOrgAccess(orgSlug: string) {
  const session = await requireSession();
  if (session.organization.slug !== orgSlug) {
    throw new Error(
      `Forbidden: authenticated as ${session.organization.slug} but URL requested ${orgSlug}`,
    );
  }
  return session;
}

void DEMO_USER;
void DEMO_ORG;
