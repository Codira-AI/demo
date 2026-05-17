/**
 * Embed loader script.
 *
 * Served at /api/embed.js — customers paste:
 *
 *   <script
 *     src="https://tessera.app/api/embed.js?board=demo-inc/ship-tracker">
 *   </script>
 *
 * The script's own `?board=...` query string tells it which board
 * to render. On execution it:
 *
 *   1. Finds its own <script> element (by scanning document.scripts
 *      backward — the last one is usually self).
 *   2. Reads the `board` query param, validates `orgSlug/boardSlug`.
 *   3. Creates an iframe pointing at /embed/{orgSlug}/{boardSlug}.
 *   4. Inserts the iframe right after its own <script> tag.
 *   5. Listens for `tessera:height` postMessages from the iframe and
 *      resizes accordingly.
 *
 * The script is generated on the server so the iframe origin auto-
 * matches whatever host this is served from (no hardcoded URL). That
 * matters: self-hosted Tessera deployments can serve this file and
 * the embeds it creates point at the right place automatically.
 *
 * Cached at the CDN with `s-maxage=60` — short enough that bumps to
 * the loader behavior propagate quickly, long enough that we don't
 * hit Next.js for every page load that includes the snippet.
 */

import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  // The iframe origin is whatever host requested /api/embed.js.
  // x-forwarded-host (CDN / proxy) takes precedence, then host.
  const origin =
    req.headers.get('x-forwarded-host') ??
    req.headers.get('host') ??
    'localhost:3000';
  const protocol =
    req.headers.get('x-forwarded-proto') ??
    (origin.startsWith('localhost') ? 'http' : 'https');

  const baseUrl = `${protocol}://${origin}`;

  // The loader is a single IIFE so it can be embedded multiple
  // times on the same page (one per board) without colliding.
  // Stringified and served as application/javascript.
  const script = `(function () {
  // Find this script's own <script> tag — the last one in the
  // document at parse time is reliably "us" because browsers
  // execute scripts in document order.
  var scripts = document.getElementsByTagName('script');
  var self = scripts[scripts.length - 1];
  if (!self || !self.src) return;

  var url;
  try {
    url = new URL(self.src);
  } catch (e) {
    return;
  }

  var board = url.searchParams.get('board');
  if (!board || !/^[a-z0-9-]+\\/[a-z0-9-]+$/i.test(board)) {
    console.warn('[tessera] missing or invalid board param. Expected: ?board=orgSlug/boardSlug');
    return;
  }

  var iframe = document.createElement('iframe');
  iframe.src = ${JSON.stringify(baseUrl)} + '/embed/' + board;
  iframe.style.width = '100%';
  iframe.style.border = 'none';
  iframe.style.height = '400px'; // initial; updated by postMessage
  iframe.style.display = 'block';
  iframe.setAttribute('title', 'Tessera feedback board');
  iframe.setAttribute('loading', 'lazy');

  // Insert the iframe right after this <script> tag — preserves
  // the embedding author's intent for where the widget should land.
  if (self.parentNode) {
    self.parentNode.insertBefore(iframe, self.nextSibling);
  }

  // Resize coordination. Iframe broadcasts content height; we set
  // the iframe's style.height to match. Origin lock would be nice
  // here (only accept messages from our own iframe.src origin) but
  // that adds setup complexity; for the demo we accept any origin
  // and rely on the message-shape check.
  window.addEventListener('message', function (event) {
    var data = event.data;
    if (!data || data.type !== 'tessera:height' || typeof data.height !== 'number') return;
    if (event.source !== iframe.contentWindow) return;
    iframe.style.height = data.height + 'px';
  });
})();
`;

  return new Response(script, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      // Short CDN cache — long enough to dedupe a single page load,
      // short enough that loader bugfixes propagate inside a minute.
      'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
