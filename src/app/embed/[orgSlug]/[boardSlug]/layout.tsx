/**
 * Embed layout — chrome-less wrapper for iframe contexts.
 *
 * Three things matter here:
 *
 *   1. NO branding header / footer. The parent page already has its
 *      own brand. We render only the board content.
 *
 *   2. Transparent body background so the embed adopts the parent
 *      page's color. Customers can put us on dark, light, or any
 *      brand color without us clashing.
 *
 *   3. CSP via Next.js metadata: `frame-ancestors *` so the page
 *      can be iframed from any origin. (The Next.js default is
 *      X-Frame-Options: SAMEORIGIN which would block third-party
 *      embedding entirely.) See the export below.
 *
 * Resize coordination with the parent (postMessage 'tessera:height')
 * lives in the EmbedHeightSync client component, mounted by the
 * page itself so layout-level effects stay minimal.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  // Open Graph hidden — embeds shouldn't influence the parent
  // page's social previews.
  robots: 'noindex, nofollow',
};

// CSP headers via the Next.js `headers()` function would normally
// live in middleware, but we exempt /embed/* from the Clerk middleware
// already (see middleware.ts matcher) so we need a route-segment
// config instead. Next 15's `headers()` route segment config does it.
//
// Note: this is a route segment export — Next.js picks it up
// automatically for any route under this segment.
export async function generateMetadata(): Promise<Metadata> {
  return metadata;
}

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="min-h-0 bg-transparent text-ink-0"
      // Inline-style transparency so the body's bg-bg-0 from the
      // root layout doesn't override. The parent page bleeds through.
      style={{ backgroundColor: 'transparent' }}
    >
      {children}
    </div>
  );
}
