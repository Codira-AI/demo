/**
 * Next.js config.
 *
 * The only non-default thing here is the embed CSP override. Every
 * other route gets Next's default `X-Frame-Options: SAMEORIGIN`
 * (effectively `frame-ancestors 'self'`) which blocks third-party
 * iframing. Routes under `/embed/*` need to be iframable from
 * anywhere, so we override their `Content-Security-Policy` with
 * `frame-ancestors *`.
 *
 * Production hardening note: in a real product you'd probably let
 * each org allow-list specific parent origins (so an attacker can't
 * phish-iframe your widget on a lookalike domain). For the demo
 * we keep it open — the widget is a read-only feedback board,
 * very low abuse surface.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // CODIRA_DEMO: this is a demo project — src/lib/demo-errors.ts
  // contains an intentional type error so Codira's Phase 2 static
  // analyzer has something to flag in the first-steps card. We
  // allow the build to succeed regardless so `npm run dev` /
  // `npm run build` still work end-to-end. In a real project,
  // leave this off (the default) so type errors block deploys.
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/embed/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors *;",
          },
          // Some CDNs / browsers still honor the older header even
          // when CSP frame-ancestors is set. Explicitly omit it
          // here by setting to ALLOWALL (Next's default DENY would
          // otherwise win).
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
