/**
 * Billing — current plan + upgrade/downgrade buttons.
 *
 * Three plans (free / pro / team). Current plan is highlighted; the
 * other two have an "Upgrade" or "Switch" button that fires a server
 * action (Day 3A). In DEMO_MODE the action takes effect immediately;
 * in real mode it redirects to Stripe Checkout.
 *
 * The "demo_checkout=true" query param shows a success notice after
 * the mock checkout completes, mimicking the post-Stripe-redirect
 * landing experience.
 */

import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import { requireOrgAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/format';
import type { Plan } from '@prisma/client';

type PlanRow = {
  key: Plan;
  name: string;
  price: string;
  features: string[];
};

const PLANS: PlanRow[] = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    features: [
      '1 public feedback board',
      'Unlimited customer posts',
      'Up to 3 team members',
      'Community support',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$24/mo',
    features: [
      'Unlimited public boards',
      'Unlimited customer posts',
      'Up to 10 team members',
      'Email notifications',
      'Embeddable widget',
      'Email support',
    ],
  },
  {
    key: 'team',
    name: 'Team',
    price: '$94/seat/mo',
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'Audit logs',
      'Single sign-on (SAML)',
      'Priority support + Slack',
    ],
  },
];

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ demo_checkout?: string; demo_portal?: string }>;
}) {
  // Billing changes are admin-only — see requireOrgAdmin in lib/auth.ts.
  const { orgSlug } = await params;
  const { demo_checkout, demo_portal } = await searchParams;
  const { organization } = await requireOrgAdmin();
  // requireOrgAdmin uses the authenticated session, but the URL
  // still has to match — same multi-tenant check the layout does.
  if (organization.slug !== orgSlug) {
    throw new Error('org slug mismatch');
  }

  const subscription = await db.subscription.findUnique({
    where: { organization_id: organization.id },
  });

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-ink-2">
          Manage your plan and payment method.
        </p>
      </header>

      {demo_checkout === 'true' && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          ✓ Demo checkout completed — your plan is now {organization.plan}.{' '}
          <Link href={`/${orgSlug}/billing`} className="underline">
            Dismiss
          </Link>
        </div>
      )}

      {demo_portal === 'true' && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          Demo mode: a real Stripe Billing Portal would open here. Cancel /
          downgrade via the buttons below in the meantime.{' '}
          <Link href={`/${orgSlug}/billing`} className="underline">
            Dismiss
          </Link>
        </div>
      )}

      <section className="mb-6 rounded-lg border border-edge bg-bg-1 p-4">
        <div className="text-xs uppercase tracking-wider text-ink-2">
          Current plan
        </div>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="text-2xl font-semibold capitalize text-ink-0">
            {organization.plan}
          </span>
          {subscription && subscription.status === 'active' && organization.current_period_end && (
            <span className="text-xs text-ink-2">
              Renews {formatDate(organization.current_period_end)}
            </span>
          )}
          {subscription?.cancel_at_period_end && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              Cancels at period end
            </span>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-2">
          Plans
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              isCurrent={plan.key === organization.plan}
              orgSlug={orgSlug}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
  orgSlug,
}: {
  plan: PlanRow;
  isCurrent: boolean;
  orgSlug: string;
}) {
  return (
    <div
      className={`flex flex-col rounded-lg border p-4 ${
        isCurrent ? 'border-accent bg-accent/5' : 'border-edge bg-bg-1'
      }`}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-ink-0">{plan.name}</h3>
        {isCurrent && (
          <span className="rounded-full bg-accent px-2 py-0.5 text-2xs font-semibold text-white">
            Current
          </span>
        )}
      </div>
      <div className="mb-3 text-xl font-semibold text-ink-0">{plan.price}</div>
      <ul className="mb-4 flex-1 space-y-1.5 text-xs text-ink-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-1.5">
            <Check size={12} className="mt-0.5 shrink-0 text-emerald-500" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {!isCurrent && (
        <Link
          href={`/${orgSlug}/billing/upgrade?plan=${plan.key}`}
          className="inline-flex items-center justify-center gap-1 rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent/90"
        >
          Switch to {plan.name}
          <ArrowRight size={12} />
        </Link>
      )}
    </div>
  );
}
