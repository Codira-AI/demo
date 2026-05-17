/**
 * Billing public API.
 *
 * Every server action that touches billing imports from this file —
 * never directly from `stripe`. In DEMO_MODE the real-path branch
 * is dead code; in production the mock branch is dead code. Tree-
 * shaking handles the rest.
 *
 * Functions:
 *   createCheckoutSession  — start a plan upgrade
 *   createBillingPortalSession — open Stripe's hosted "manage subscription" UI
 *   cancelSubscription      — cancel at period end (no immediate downgrade)
 *   calculateProration      — pure utility; see CODIRA_DEMO note below
 */

import { isDemoMode } from './demo';
import {
  mockCreateCheckoutSession,
  mockCreateBillingPortalSession,
  mockCancelSubscription,
} from './billing-mock';
import type { Plan } from '@prisma/client';

export type CheckoutSessionInput = {
  organizationId: string;
  plan: Plan;
  successUrl: string;
  cancelUrl: string;
};
export type CheckoutSessionResult = {
  redirectUrl: string;
  sessionId: string;
};

export type BillingPortalInput = {
  stripeCustomerId: string;
  returnUrl: string;
};
export type BillingPortalResult = {
  portalUrl: string;
};

export async function createCheckoutSession(
  input: CheckoutSessionInput,
): Promise<CheckoutSessionResult> {
  if (isDemoMode()) return mockCreateCheckoutSession(input);

  // Real Stripe Checkout. Dynamic import so DEMO_MODE deployments
  // don't need STRIPE_SECRET_KEY at boot.
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'));

  const priceId = PRICE_ID_FOR_PLAN[input.plan];
  if (!priceId) {
    throw new Error(`No Stripe price ID configured for plan ${input.plan}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${input.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: input.cancelUrl,
    metadata: {
      organization_id: input.organizationId,
      plan: input.plan,
    },
    subscription_data: {
      metadata: {
        organization_id: input.organizationId,
        plan: input.plan,
      },
    },
  });

  if (!session.url) {
    throw new Error('Stripe returned a session without a URL');
  }
  return { redirectUrl: session.url, sessionId: session.id };
}

export async function createBillingPortalSession(
  input: BillingPortalInput,
): Promise<BillingPortalResult> {
  if (isDemoMode()) return mockCreateBillingPortalSession(input);

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'));
  const portal = await stripe.billingPortal.sessions.create({
    customer: input.stripeCustomerId,
    return_url: input.returnUrl,
  });
  return { portalUrl: portal.url };
}

export async function cancelSubscription(organizationId: string): Promise<void> {
  if (isDemoMode()) return mockCancelSubscription(organizationId);

  // Real Stripe path. Look up the subscription, cancel at period end.
  const { db } = await import('./db');
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { stripe_subscription_id: true },
  });
  if (!org?.stripe_subscription_id) {
    throw new Error('No active subscription found for organization');
  }
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'));
  await stripe.subscriptions.update(org.stripe_subscription_id, {
    cancel_at_period_end: true,
  });
  // The cancel takes effect at period end; the webhook handler
  // flips the DB row when Stripe fires the deleted event.
}

/**
 * CODIRA_DEMO: QA agent target
 *
 * Pure proration utility — no DB, no Stripe, just math. The
 * function has no test file. Try it in the chat panel:
 *
 *   /qa write tests for calculateProration in src/lib/billing.ts.
 *   Cover: same-plan no-op, upgrade mid-cycle, downgrade at period
 *   end, switch from monthly to annual.
 *
 * The QA agent will produce a test file with 4-6 cases; the
 * implementer writes it next to this module.
 *
 * Returns the prorated credit/debit amount in cents (positive =
 * credit owed to customer, negative = additional charge). Assumes
 * a 30-day billing month for simplicity — real Stripe uses
 * day-accurate proration but the math is the same shape.
 */
export function calculateProration(input: {
  currentPlanCents: number;
  newPlanCents: number;
  daysIntoCycle: number;
  cycleDays?: number;
}): number {
  const cycleDays = input.cycleDays ?? 30;
  if (input.currentPlanCents === input.newPlanCents) return 0;
  if (input.daysIntoCycle <= 0 || input.daysIntoCycle >= cycleDays) return 0;

  const daysRemaining = cycleDays - input.daysIntoCycle;
  const currentUnused = (input.currentPlanCents * daysRemaining) / cycleDays;
  const newUnused = (input.newPlanCents * daysRemaining) / cycleDays;

  // Positive when new plan is cheaper (customer is owed credit),
  // negative when more expensive (customer owes more).
  return Math.round(currentUnused - newUnused);
}

// ─── helpers ────────────────────────────────────────────────────

/** Stripe price IDs per plan. Real values get set in production env
 *  vars and read here at request time. Demo mode never reads these. */
const PRICE_ID_FOR_PLAN: Record<Plan, string | undefined> = {
  free: undefined, // free has no Stripe price
  pro: process.env.STRIPE_PRICE_ID_PRO,
  team: process.env.STRIPE_PRICE_ID_TEAM,
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `${name} is not set. Either set it in .env.local or run with DEMO_MODE=true.`,
    );
  }
  return v;
}
