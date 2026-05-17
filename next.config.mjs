/**
 * Next.js config.
 *
 * Deliberately minimal — the demo aims to be production-shaped
 * without leaning on framework features that mask what the code is
 * doing. Anything more exotic (custom webpack, image domains, etc.)
 * gets added when an actual feature needs it.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The embeddable widget at /embed/* gets framed into customer apps.
  // We opt those routes out of the default X-Frame-Options DENY by
  // setting frame-ancestors via CSP on the route itself (see the
  // route's metadata) — nothing global to set here.
};

export default nextConfig;
