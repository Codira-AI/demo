/**
 * Authed area layout — sidebar + content frame for every page
 * under /[orgSlug]/{dashboard,projects,tasks,feedback,billing}.
 *
 * Guard: requireOrgAccess(orgSlug) rejects URL manipulation. If
 * the authenticated user belongs to a different org and tries to
 * GET /other-org/dashboard, this throws before any data renders.
 *
 * The (authed) route group doesn't appear in the URL — Next.js
 * convention — so the path stays /[orgSlug]/dashboard, not
 * /authed/[orgSlug]/dashboard.
 */

import { requireOrgAccess } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';

export default async function AuthedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { user, organization } = await requireOrgAccess(orgSlug);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        orgSlug={organization.slug}
        orgName={organization.name}
        userEmail={user.email}
        userName={user.name}
      />
      <main className="min-w-0 flex-1 bg-bg-0">{children}</main>
    </div>
  );
}
