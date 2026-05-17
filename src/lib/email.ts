/**
 * Email public API.
 *
 * One sender function, three template helpers. Pages and server
 * actions import only what they need. The switch between Resend
 * (real) and console (mock) lives in sendEmail() below.
 *
 * Why no React Email templates today: the demo's value is in the
 * IDE-feature showcase, not the email design. Plain HTML strings
 * keep the surface area small. Swapping to React Email is a
 * single-file change when the demo grows up.
 */

import { isDemoMode } from './demo';
import { mockSendEmail } from './email-mock';

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  /** HTML body. Provide this OR `text` (or both). */
  html?: string;
  /** Plain-text body. */
  text?: string;
  /** Override the default from-address. Optional. */
  from?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<{ id: string }> {
  if (isDemoMode()) return mockSendEmail(input);

  // Real Resend path.
  const { Resend } = await import('resend');
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY is not set. Either set it in .env.local or run with DEMO_MODE=true.',
    );
  }
  const resend = new Resend(apiKey);
  const from = input.from ?? process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

  const result = await resend.emails.send({
    from,
    to: Array.isArray(input.to) ? input.to : [input.to],
    subject: input.subject,
    html: input.html ?? `<pre>${input.text ?? ''}</pre>`,
    text: input.text,
  });

  if (result.error) {
    throw new Error(`Resend error: ${result.error.message}`);
  }
  return { id: result.data?.id ?? '' };
}

// ─── template helpers ───────────────────────────────────────────

/** "New feedback post" — sent to project owners when a customer
 *  submits feedback. Used by the post-creation server action. */
export function renderNewPostEmail(input: {
  ownerName: string;
  projectName: string;
  postTitle: string;
  postBody: string | null;
  postUrl: string;
  customerName: string | null;
  customerEmail: string;
}): { subject: string; html: string; text: string } {
  const subject = `New feedback on ${input.projectName}: ${input.postTitle}`;
  const author = input.customerName ?? input.customerEmail;
  const html = `
    <p>Hi ${escape(input.ownerName)},</p>
    <p><strong>${escape(author)}</strong> just posted to <strong>${escape(input.projectName)}</strong>:</p>
    <blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#444">
      <h3 style="margin:0 0 8px 0">${escape(input.postTitle)}</h3>
      ${input.postBody ? `<p>${escape(input.postBody)}</p>` : ''}
    </blockquote>
    <p><a href="${input.postUrl}">View on Tessera →</a></p>
  `;
  const text = `New feedback on ${input.projectName} from ${author}\n\n${input.postTitle}\n\n${input.postBody ?? ''}\n\nView: ${input.postUrl}`;
  return { subject, html, text };
}

/** "Your post status changed" — sent to the customer who authored
 *  the post when the team updates its status (planned, in_progress,
 *  completed, declined). */
export function renderStatusChangeEmail(input: {
  customerName: string | null;
  postTitle: string;
  oldStatus: string;
  newStatus: string;
  postUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `"${input.postTitle}" is now ${formatStatus(input.newStatus)}`;
  const html = `
    <p>Hi ${escape(input.customerName ?? 'there')},</p>
    <p>The team updated the status of your post:</p>
    <p><strong>${escape(input.postTitle)}</strong></p>
    <p>${formatStatus(input.oldStatus)} → <strong>${formatStatus(input.newStatus)}</strong></p>
    <p><a href="${input.postUrl}">View your post →</a></p>
  `;
  const text = `Your post "${input.postTitle}" was updated.\n${formatStatus(input.oldStatus)} → ${formatStatus(input.newStatus)}\n\nView: ${input.postUrl}`;
  return { subject, html, text };
}

// ─── helpers ────────────────────────────────────────────────────

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}
