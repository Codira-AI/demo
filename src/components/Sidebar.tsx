/**
 * Authed-area sidebar.
 *
 * Six items in a fixed order:
 *   Dashboard / Projects / Tasks / Feedback / Billing / (footer: account)
 *
 * Lives inside the (authed) layout, so every page under
 * /[orgSlug]/* gets it for free. The active state is computed
 * client-side from `usePathname` because that's cheap and
 * route-changes don't need a server round-trip.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  MessageSquare,
  CreditCard,
} from 'lucide-react';

type Item = {
  href: (orgSlug: string) => string;
  label: string;
  match: (pathname: string, orgSlug: string) => boolean;
  Icon: typeof LayoutDashboard;
};

const ITEMS: Item[] = [
  {
    href: (org) => `/${org}/dashboard`,
    label: 'Dashboard',
    match: (p, org) => p === `/${org}/dashboard`,
    Icon: LayoutDashboard,
  },
  {
    href: (org) => `/${org}/projects`,
    label: 'Projects',
    match: (p, org) => p.startsWith(`/${org}/projects`),
    Icon: FolderKanban,
  },
  {
    href: (org) => `/${org}/tasks`,
    label: 'Tasks',
    match: (p, org) => p.startsWith(`/${org}/tasks`),
    Icon: ListChecks,
  },
  {
    href: (org) => `/${org}/feedback`,
    label: 'Feedback',
    match: (p, org) => p.startsWith(`/${org}/feedback`),
    Icon: MessageSquare,
  },
  {
    href: (org) => `/${org}/billing`,
    label: 'Billing',
    match: (p, org) => p.startsWith(`/${org}/billing`),
    Icon: CreditCard,
  },
];

export function Sidebar({
  orgSlug,
  orgName,
  userEmail,
  userName,
}: {
  orgSlug: string;
  orgName: string;
  userEmail: string;
  userName: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-edge bg-bg-1">
      <div className="border-b border-edge px-4 py-4">
        <div className="text-xs uppercase tracking-wider text-ink-2">
          Organization
        </div>
        <div className="mt-0.5 truncate text-sm font-semibold text-ink-0" title={orgName}>
          {orgName}
        </div>
      </div>

      <nav className="flex-1 px-2 py-3">
        {ITEMS.map((item) => {
          const active = item.match(pathname, orgSlug);
          return (
            <Link
              key={item.label}
              href={item.href(orgSlug)}
              className={clsx(
                'mb-0.5 flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-bg-2 text-ink-0'
                  : 'text-ink-1 hover:bg-bg-2 hover:text-ink-0',
              )}
            >
              <item.Icon size={15} className={active ? 'text-accent' : 'text-ink-2'} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-edge px-4 py-3 text-xs">
        <div className="truncate text-ink-0" title={userName ?? userEmail}>
          {userName ?? userEmail}
        </div>
        <div className="truncate text-ink-2" title={userEmail}>
          {userEmail}
        </div>
      </div>
    </aside>
  );
}
