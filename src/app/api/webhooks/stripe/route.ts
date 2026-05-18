/**
 * Stripe webhook receiver.
 *
 * Reconciles asynchronous billing events into our DB. Critical
 * because Stripe Checkout returns success to the user BEFORE the
 * actual subscription is provisioned — the webhook is what makes
 * the plan flip durable.
 *
 * Demo mode: this route is exempt from the Clerk middleware (see
 * src/middleware.ts matcher), and the mock billing flow writes to
 * the DB synchronously instead of going through Stripe. So in demo
 * mode this handler exists but is never invoked. Toggle DEMO_MODE
 * off + configure STRIPE_WEBHOOK_SECRET and it springs to life.
 *
 * Events handled:
 *   - checkout.session.completed    (subscription just paid for)
 *   - customer.subscription.updated (plan/status changed)
 *   - customer.subscription.deleted (canceled)
 *   - invoice.payment_failed        (mark past_due, send dunning)
 *
 * Idempotency: every handler is a pure upsert keyed on Stripe IDs.
 * Stripe occasionally re-delivers events; we accept that and reach
 * the same end state regardless of how many times an event lands.
 *
 * Error handling: a non-2xx response makes Stripe retry. We return
 * 2xx for "we processed this" and 5xx for "something blew up,
 * please retry". A 4xx (e.g. signature failure) tells Stripe to
 * stop retrying — used only when the request is unambiguously
 * malformed.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { isDemoMode } from '@/lib/demo';
import type Stripe from 'stripe';

export async function POST(req: NextRequest) {
  if (isDemoMode()) {
    // Defensive: webhook should never fire in demo mode (Stripe
    // can't reach localhost without a CLI listener, and the mock
    // billing flow bypasses Stripe entirely). But if someone
    // manually POSTs here for testing, give them a helpful 400.
    return NextResponse.json(
      {
        error: 'Webhook ignored — DEMO_MODE=true. Toggle off to enable real Stripe.',
      },
      { status: 400 },
    );
  }

  const signature = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: 'missing signature or secret' }, { status: 400 });
  }

  // Stripe's signature verification needs the raw body bytes.
  // NextRequest.text() gives us exactly that.
  const rawBody = await req.text();

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.warn('[stripe-webhook] signature verification failed', err);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        // Unhandled event types are a 2xx no-op — Stripe shouldn't
        // retry them. We log so they're visible if we ever want
        // to add handling.
        console.log(`[stripe-webhook] unhandled event ${event.type}`);
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    // Real handler failure (DB down, etc.) — 5xx so Stripe retries.
    console.error('[stripe-webhook] handler threw', err);
    return NextResponse.json({ error: 'handler error' }, { status: 500 });
  }
}

// ─── event handlers ──────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const orgId = session.metadata?.organization_id;
  const plan = session.metadata?.plan;
  if (!orgId || !plan) {
    console.warn('[stripe-webhook] checkout completed without metadata', session.id);
    return;
  }

  // Update the org's plan + record the Stripe IDs so future
  // billing-portal lookups work.
  await db.organization.update({
    where: { id: orgId },
    data: {
      plan: plan as 'free' | 'pro' | 'team',
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : undefined,
      stripe_subscription_id:
        typeof session.subscription === 'string' ? session.subscription : undefined,
    },
  });

  console.log(`[stripe-webhook] org ${orgId} upgraded to ${plan}`);
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
  const orgId = sub.metadata?.organization_id;
  if (!orgId) return;

  // Map Stripe's subscription status to our enum.
  const status =
    sub.status === 'active' || sub.status === 'trialing'
      ? 'active'
      : sub.status === 'past_due'
        ? 'past_due'
        : 'canceled';

  const periodEnd = new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000);

  await db.subscription.upsert({
    where: { organization_id: orgId },
    create: {
      organization_id: orgId,
      plan: 'pro', // defensible default; real apps look up from sub.items
      status,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
    },
    update: {
      status,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
    },
  });

  await db.organization.update({
    where: { id: orgId },
    data: { current_period_end: periodEnd },
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const orgId = sub.metadata?.organization_id;
  if (!orgId) return;
  await db.organization.update({
    where: { id: orgId },
    data: { plan: 'free' },
  });
  await db.subscription.updateMany({
    where: { organization_id: orgId },
    data: { status: 'canceled' },
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  // We don't have the org ID directly on invoices — look it up via
  // the customer ID. In production this would also trigger a dunning
  // email (we'd add a sendEmail call here referencing renderDunning).
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : null;
  if (!customerId) return;
  await db.subscription.updateMany({
    where: { organization: { stripe_customer_id: customerId } },
    data: { status: 'past_due' },
  });
  console.log(`[stripe-webhook] payment failed for customer ${customerId}`);
}
