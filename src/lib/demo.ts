/**
 * Demo-mode flag.
 *
 * When `DEMO_MODE=true` (the default in .env.example), the lib/auth,
 * lib/billing, and lib/email modules swap their real-provider
 * implementations for in-process mocks. Everything else — database
 * access, server actions, page rendering, even the API routes — is
 * identical between demo mode and production.
 *
 * To run against real services: set DEMO_MODE=false, fill in
 * Clerk/Stripe/Resend keys in .env.local, restart. No code changes.
 *
 * Why a function and not a constant: env vars can change between
 * SSR and edge-rendered routes; reading at call-time avoids any
 * "cached at import" footguns. The check itself is trivially cheap.
 */

export function isDemoMode(): boolean {
  return (process.env.DEMO_MODE ?? 'false').toLowerCase() === 'true';
}

/** Identifier for the default mock-user session. Hard-coded so the
 *  demo always signs you in as the same person — predictable for
 *  videos and reproducible bug reports. */
export const DEMO_USER = {
  clerk_user_id: 'demo_user_codira',
  email: 'demo@codira.dev',
  name: 'Demo Codira',
  role: 'admin' as const,
} as const;

/** The single seeded org. Slug appears in public URLs (e.g.
 *  /demo-inc/ship-tracker). */
export const DEMO_ORG = {
  clerk_org_id: 'demo_org_codira',
  name: 'Demo Inc.',
  slug: 'demo-inc',
} as const;
