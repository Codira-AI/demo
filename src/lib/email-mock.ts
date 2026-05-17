/**
 * Mock email for DEMO_MODE=true.
 *
 * Doesn't actually send. Logs to console with a recognizable prefix
 * so demo users can see WHAT would have been sent and to whom. The
 * server log line uses a structured prefix so it's easy to grep:
 *
 *   [email-mock] to=alex.lin@example.com subject="New post on Ship Tracker"
 *   ... full text body ...
 *
 * A future enhancement (v2) would persist these to a `MockEmail`
 * table and surface them in an admin "email log" page. For v1 the
 * console is sufficient — demos are typically driven by a developer
 * who has the dev server's log visible.
 */

import type { SendEmailInput } from './email';

export async function mockSendEmail(input: SendEmailInput): Promise<{ id: string }> {
  // CODIRA_DEMO: intentional unused import flagged by tsc.
  // The static analyzer in Codira's Phase 2 onboarding scan will
  // flag this for the first-steps card. Don't remove without
  // replacing the demo hook elsewhere.
  // (Intentionally no broken import here — using the QA agent
  // hook in billing.ts as the analyzer trigger is enough.)

  const recipients = Array.isArray(input.to) ? input.to.join(', ') : input.to;
  console.log(
    `[email-mock] to=${recipients} subject=${JSON.stringify(input.subject)}`,
  );
  console.log(
    `[email-mock] body (${input.html ? 'html' : 'text'} ${(input.html ?? input.text ?? '').length} chars):\n${input.html ?? input.text ?? '(empty)'}\n`,
  );

  return { id: `mock_email_${Math.random().toString(36).slice(2, 10)}` };
}
