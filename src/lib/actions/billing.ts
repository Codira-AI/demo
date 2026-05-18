/**
 * Server actions for billing.
 *
 * startUpgrade(plan) — creates a Checkout Session and redirects.
 *   In demo mode, the mock writes to the DB immediately and lands
 *   the user on /billing?demo_checkout=true.
 *   In real mode, returns the Stripe URL and the redirect drops
 *   the user into Stripe-hosted Checkout. The actual plan flip
 *   happens via the webhook handler in api/webhooks/stripe.
 *
 * openBillingPortal() — creates a Stripe Billing Portal session
 *   and redirects. Same demo/real switch.
 *
 * cancelOrgSubscription() — cancel at period end. Demo writes
 *   the canceled state directly; real mode hits Stripe and waits
 *   for the webhook to confirm.
 */

'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireOrgAdmin } from '@/lib/auth';
import {
  createCheckoutSession,
  createBillingPortalSession,
  cancelSubscription,
} from '@/lib/billing';
import type { Plan } from '@prisma/client';

const upgradeSchema = z.object({
  orgSlug: z.string().min(1),
  plan: z.enum(['free', 'pro', 'team']),
});

export async function startUpgrade(formData: FormData): Promise<void> {
  const { organization } = await requireOrgAdmin();
  const parsed = upgradeSchema.parse({
    orgSlug: formData.get('orgSlug'),
    plan: formData.get('plan'),
  });
  if (organization.slug !== parsed.orgSlug) {
    throw new Error('org slug mismatch');
  }
  if (parsed.plan === 'free') {
    // "Switch to free" is really cancellation. Route through that
    // path explicitly so the user gets the right UX (Cancellation
    // confirmation, cancel-at-period-end semantics).
    await cancelOrgSubscriptionInternal(organization.id);
    revalidatePath(`/${parsed.orgSlug}/billing`);
    redirect(`/${parsed.orgSlug}/billing?demo_portal=true`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const session = await createCheckoutSession({
    organizationId: organization.id,
    plan: parsed.plan as Plan,
    successUrl: `${appUrl}/${parsed.orgSlug}/billing`,
    cancelUrl: `${appUrl}/${parsed.orgSlug}/billing`,
  });

  revalidatePath(`/${parsed.orgSlug}/billing`);
  redirect(session.redirectUrl);
}

export async function openBillingPortal(formData: FormData): Promise<void> {
  const { organization } = await requireOrgAdmin();
  const orgSlug = formData.get('orgSlug') as string;
  if (organization.slug !== orgSlug) {
    throw new Error('org slug mismatch');
  }
  if (!organization.stripe_customer_id) {
    throw new Error('No Stripe customer ID — you may be on a free plan.');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const session = await createBillingPortalSession({
    stripeCustomerId: organization.stripe_customer_id,
    returnUrl: `${appUrl}/${orgSlug}/billing`,
  });

  redirect(session.portalUrl);
}

export async function cancelOrgSubscription(formData: FormData): Promise<void> {
  const { organization } = await requireOrgAdmin();
  const orgSlug = formData.get('orgSlug') as string;
  if (organization.slug !== orgSlug) {
    throw new Error('org slug mismatch');
  }
  await cancelOrgSubscriptionInternal(organization.id);
  revalidatePath(`/${orgSlug}/billing`);
}

/** Internal because both startUpgrade(free) and cancelOrgSubscription
 *  invoke the same flow. Keeps the auth check at the public-action
 *  boundary, this helper just does the work. */
async function cancelOrgSubscriptionInternal(orgId: string): Promise<void> {
  await cancelSubscription(orgId);
}
