import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tessera — feedback + project management',
  description:
    'A demo SaaS built with Codira. Project tracking + customer feedback boards for indie SaaS makers.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg-0 text-ink-0 antialiased">
        {children}
      </body>
    </html>
  );
}
