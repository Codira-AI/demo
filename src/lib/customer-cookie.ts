/**
 * Customer-identity cookie helpers.
 *
 * Public feedback boards have no auth — we identify customers by
 * email instead. To save users from typing their email on every
 * vote, we drop a `tessera_customer_email` cookie on first
 * interaction and re-use it for subsequent actions.
 *
 * The cookie is unsigned and trivially forgeable. That's fine for
 * the demo's threat model: anyone can claim to be anyone, but the
 * `(post_id, voter_email)` unique constraint on Vote means one vote
 * per (post, claimed-email) pair regardless of who's claiming.
 * Production-grade voting would require email verification — a
 * one-line addition (send a magic link, verify before recording).
 *
 * Cookie lifetime: 1 year. Long enough to not annoy returning
 * visitors; short enough that a stale identity eventually clears.
 */

import { cookies } from 'next/headers';

const COOKIE_NAME = 'tessera_customer_email';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

/** Read the customer email from the request cookies. Returns null
 *  when no cookie is set. Pure read — no side effects. */
export async function getCustomerEmail(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  // Minimal validation: must look vaguely like an email. Hard
  // validation happens at the action layer; this just prevents
  // a malformed cookie from poisoning downstream queries.
  if (!raw.includes('@')) return null;
  return raw.toLowerCase().trim();
}

/** Set the customer email cookie. Call from inside a server action
 *  AFTER the action's primary mutation has succeeded. */
export async function setCustomerEmail(email: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, email.toLowerCase().trim(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

/** Clear the cookie — used by the "switch identity" flow if/when
 *  we add one. Currently unused; ships with the helper because the
 *  alternative is a one-off cookie API call at the eventual call site. */
export async function clearCustomerEmail(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
