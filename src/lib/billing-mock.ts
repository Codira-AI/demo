/**
 * Mock billing for DEMO_MODE=true.
 *
 * The flow approximates Stripe's Checkout + Webhook handshake
 * without any external dependency:
 *
 *   - createCheckoutSession() writes a fake Subscription directly
 *     to the DB and returns a URL that lands on a success page.
 *     No redirect to stripe.com, no card form, no waiting.
 *
 *   - createBillingPortalSession() returns a URL to an in-app
 *     "manage subscription" page (just the existing /billing route
 *     with a query flag so the UI shows a confirmation toast).
 *
 *   - cancelSubscription() flips the org's plan back to 'free' and
 *     marks the Subscription row as canceled.
 *
 * The shape mirrors the real billing API so the page-level code
 * (server actions, components) is identical between demo and real.
 */

import { db } from './db';
import type {
  CheckoutSessionInput,
  CheckoutSessionResult,
  BillingPortalInput,
  BillingPortalResult,
} from './billing';

export async function mockCreateCheckoutSession(
  input: CheckoutSessionInput,
): Promise<CheckoutSessionResult> {
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Set the org to the requested plan immediately. In a real Stripe
  // flow this would happen via the checkout.session.completed
  // webhook AFTER the user paid; we shortcut it for the demo.
  await db.organization.update({
    where: { id: input.organizationId },
    data: {
      plan: input.plan,
      stripe_customer_id: `mock_cus_${input.organizationId.slice(0, 8)}`,
      stripe_subscription_id: `mock_sub_${input.organizationId.slice(0, 8)}`,
      current_period_end: periodEnd,
    },
  });

  // Mirror the subscription row.
  await db.subscription.upsert({
    where: { organization_id: input.organizationId },
    create: {
      organization_id: input.organizationId,
      plan: input.plan,
      status: 'active',
      current_period_end: periodEnd,
      cancel_at_period_end: false,
    },
    update: {
      plan: input.plan,
      status: 'active',
      current_period_end: periodEnd,
      cancel_at_period_end: false,
    },
  });

  console.log(
    `[billing-mock] checkout for org=${input.organizationId} plan=${input.plan} — auto-completed`,
  );

  return {
    // Drop straight into the success route. The real implementation
    // returns a stripe.com URL the browser follows.
    redirectUrl: `${input.successUrl}?demo_checkout=true`,
    sessionId: `mock_cs_${Math.random().toString(36).slice(2, 10)}`,
  };
}

export async function mockCreateBillingPortalSession(
  input: BillingPortalInput,
): Promise<BillingPortalResult> {
  // No real portal — return a marker URL the dashboard renders as
  // a "billing portal isn't available in demo mode" notice.
  return {
    portalUrl: `${input.returnUrl}?demo_portal=true`,
  };
}

export async function mockCancelSubscription(organizationId: string): Promise<void> {
  await db.organization.update({
    where: { id: organizationId },
    data: { plan: 'free' },
  });
  await db.subscription.updateMany({
    where: { organization_id: organizationId },
    data: { status: 'canceled', cancel_at_period_end: true },
  });
  console.log(`[billing-mock] subscription canceled for org=${organizationId}`);
}
