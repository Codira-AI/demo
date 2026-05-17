/**
 * Iframe-height coordinator.
 *
 * Embeddable widgets in iframes can't size themselves — the parent
 * page sets the iframe's height attribute. The standard pattern is:
 *
 *   1. Iframe measures its content height on mount and on every
 *      content change (ResizeObserver on document.body).
 *   2. Iframe postMessage's the parent with the new height.
 *   3. Parent's loader script (api/embed.js) listens, sets
 *      iframe.style.height accordingly.
 *
 * Message shape: { type: 'tessera:height', height: 612 }
 *
 * We use ResizeObserver (widely-supported in 2025) on document.body
 * with a tiny debounce so rapid layout shifts don't flood the parent.
 * Cleanup on unmount disconnects the observer.
 */

'use client';

import { useEffect } from 'react';

export function EmbedHeightSync() {
  useEffect(() => {
    // Guard for SSR + unusual environments (jsdom, server-side render).
    if (typeof window === 'undefined') return;
    if (!('ResizeObserver' in window)) return;

    let lastReported = -1;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const broadcast = () => {
      const height = Math.ceil(document.body.scrollHeight);
      if (height === lastReported) return;
      lastReported = height;
      window.parent.postMessage(
        { type: 'tessera:height', height },
        '*', // Origin-locking would be set by the loader; we accept any parent.
      );
    };

    const onResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(broadcast, 40);
    };

    // Initial broadcast on mount.
    broadcast();

    const observer = new ResizeObserver(onResize);
    observer.observe(document.body);

    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}
