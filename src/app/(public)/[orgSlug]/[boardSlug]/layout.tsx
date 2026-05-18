/**
 * Public board layout — minimal branding header so the page reads
 * as "Tessera, hosted by Demo Inc." rather than a faceless feedback
 * form.
 *
 * No auth — anyone can land here. The /api/embed.js loader script
 * points at /embed/[orgSlug]/[boardSlug] which has its own
 * chrome-less layout; this layout is just for the human-visited URL.
 */

import Link from 'next/link';

export default function PublicBoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-0">
      <header className="border-b border-edge bg-bg-1 px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-ink-0">
            Tessera
          </Link>
          <Link
            href="https://codira.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-2xs text-ink-2 hover:text-ink-0"
          >
            built with Codira →
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-edge bg-bg-1 px-6 py-3 text-center text-2xs text-ink-2">
        Tessera demo · MIT licensed source on{' '}
        <a
          href="https://github.com/Codira-AI/demo"
          className="text-accent hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}
