import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NOIR — Venue Intelligence Demo',
  description: 'A BFP Venue Intelligence demonstration.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}