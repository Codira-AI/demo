/**
 * Plan-upgrade confirmation page.
 *
 * The billing page's plan cards link here with ?plan=pro|team.
 * This page shows a brief confirmation summary and a single
 * "Confirm & continue" button that POSTs to startUpgrade(), which
 * either redirects to Stripe (real mode) or completes the demo
 * checkout in-process (demo mode).
 *
 * Why a separate page rather than a button on /billing itself:
 *   - Gives the user a moment to read what they're switching to
 *   - Server actions that redirect away from the current page
 *     feel weird when triggered from inside a multi-card layout
 *   - Production-grade upgrade flows almost always have this step
 */

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { requireOrgAdmin } from '@/lib/auth';
import { startUpgrade } from '@/lib/actions/billing';
import type { Plan } from '@prisma/client';

const PLAN_LABELS: Record<Plan, { name: string; price: string }> = {
  free: { name: 'Free', price: '$0/mo' },
  pro: { name: 'Pro', price: '$24/mo' },
  team: { name: 'Team', price: '$94/seat/mo' },
};

export default async function UpgradePage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ plan?: string }>;
}) {
  const { orgSlug } = await params;
  const { plan } = await searchParams;
  if (!plan || !['free', 'pro', 'team'].includes(plan)) notFound();

  const targetPlan = plan as Plan;
  const { organization } = await requireOrgAdmin();
  if (organization.slug !== orgSlug) {
    throw new Error('org slug mismatch');
  }
  // Already on this plan — bounce back so the user isn't confused.
  if (organization.plan === targetPlan) {
    redirect(`/${orgSlug}/billing`);
  }

  const target = PLAN_LABELS[targetPlan];
  const current = PLAN_LABELS[organization.plan];

  return (
    <div className="mx-auto max-w-md px-8 py-12">
      <Link href={`/${orgSlug}/billing`} className="text-xs text-ink-2 hover:text-ink-0">
        ← Billing
      </Link>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Switch to {target.name}
      </h1>
      <p className="mt-1 text-sm text-ink-2">
        Confirm your plan change. You can switch back any time.
      </p>

      <div className="my-6 rounded-lg border border-edge bg-bg-1 p-4">
        <div className="flex items-center justify-between text-sm">
          <div>
            <div className="text-2xs uppercase tracking-wider text-ink-2">Current</div>
            <div className="text-ink-1">{current.name}</div>
            <div className="text-xs text-ink-2">{current.price}</div>
          </div>
          <ArrowRight size={16} className="text-ink-2" />
          <div className="text-right">
            <div className="text-2xs uppercase tracking-wider text-ink-2">New</div>
            <div className="font-semibold text-ink-0">{target.name}</div>
            <div className="text-xs text-ink-1">{target.price}</div>
          </div>
        </div>
      </div>

      <form action={startUpgrade}>
        <input type="hidden" name="orgSlug" value={orgSlug} />
        <input type="hidden" name="plan" value={targetPlan} />
        <button
          type="submit"
          className="w-full rounded bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent/90"
        >
          Confirm and continue
        </button>
      </form>

      <p className="mt-3 text-2xs text-ink-2">
        In demo mode this completes instantly. With real Stripe keys, you
        would be redirected to Stripe-hosted Checkout next.
      </p>
    </div>
  );
}
