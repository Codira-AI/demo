/**
 * Next.js middleware.
 *
 * Runs before every matched request. Two modes:
 *
 *   DEMO_MODE=true  → no-op. Every request passes through; auth.ts
 *                     returns the seeded demo identity directly.
 *
 *   DEMO_MODE=false → real Clerk middleware enforces sign-in on
 *                     protected routes. We don't import Clerk
 *                     statically because Next 15 evaluates this file
 *                     at edge-build time and the import would fail
 *                     in demo-mode builds where Clerk isn't
 *                     configured. Conditional require() instead.
 *
 * Matcher excludes static assets and webhook routes (webhooks
 * authenticate via signature, not session).
 */

import { NextResponse, type NextRequest } from 'next/server';

const isDemoMode = (process.env.DEMO_MODE ?? 'false').toLowerCase() === 'true';

export default async function middleware(req: NextRequest) {
  if (isDemoMode) {
    // Pass everything through. The "auth" is hardcoded in lib/auth.ts.
    return NextResponse.next();
  }

  // Real path. We import Clerk at request time (only ever entered
  // when DEMO_MODE=false) so demo-mode deployments don't need a
  // valid Clerk publishable key to boot. Dynamic `import()` is
  // preferred over `require()` here so the bundler treats it as
  // a code-split point (and ESLint's default rules stay happy).
  const { clerkMiddleware } = await import('@clerk/nextjs/server');
  return clerkMiddleware()(req);
}

export const config = {
  matcher: [
    // Run on all routes except static assets, _next internals, and
    // the Stripe webhook (which is signature-authed, not session-authed).
    '/((?!_next|api/webhooks|.*\\..*|favicon.ico).*)',
  ],
};
