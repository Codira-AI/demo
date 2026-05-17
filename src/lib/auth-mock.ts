/**
 * Mock identity surface for DEMO_MODE=true.
 *
 * Returns the seeded demo user + org from src/lib/demo.ts on every
 * call. No middleware needed — pages still call requireSession()
 * the same way, they just always succeed.
 *
 * If you set DEMO_MODE=false and configure real Clerk keys, none
 * of this file runs (the real-path branch in auth.ts is the only
 * thing hit). That separation lets the demo ship as a real Codira
 * showcase without bundling a fake-auth UX into the production
 * code path.
 */

import { DEMO_ORG, DEMO_USER } from './demo';

export type MockSession = {
  clerkUserId: string;
  clerkOrgId: string;
};

export function mockSession(): MockSession {
  return {
    clerkUserId: DEMO_USER.clerk_user_id,
    clerkOrgId: DEMO_ORG.clerk_org_id,
  };
}
