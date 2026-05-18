/**
 * Customer-identify form for the public board.
 *
 * Shown above the post list when no `tessera_customer_email`
 * cookie is set. After submission, the cookie is set and the page
 * is revalidated so the board re-renders with vote / submit
 * controls enabled.
 *
 * Renderable from both the public board and the embed widget (the
 * embed currently hides the submit form but voting still needs
 * identity). Pure form-action; no client-side state.
 */

import { identifyCustomer } from '@/lib/actions/posts';

export function IdentifyForm({ redirectTo }: { redirectTo: string }) {
  return (
    <form
      action={identifyCustomer}
      className="rounded-lg border border-accent/40 bg-accent/5 p-4"
    >
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent">
        Identify yourself to vote or post
      </div>
      <p className="mb-3 text-xs text-ink-2">
        We'll set a cookie so you only have to do this once. Your email is
        used to attribute votes and posts (one vote per post per email).
      </p>
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          className="flex-1 rounded border border-edge bg-bg-0 px-3 py-2 text-sm text-ink-0 placeholder:text-ink-2"
        />
        <input
          type="text"
          name="name"
          maxLength={80}
          placeholder="Display name (optional)"
          className="flex-1 rounded border border-edge bg-bg-0 px-3 py-2 text-sm text-ink-0 placeholder:text-ink-2"
        />
        <button
          type="submit"
          className="shrink-0 rounded bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90"
        >
          Continue
        </button>
      </div>
    </form>
  );
}
