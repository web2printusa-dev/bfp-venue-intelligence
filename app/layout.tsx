import type { Metadata, Viewport } from 'next';
import './globals.css';
import './venue-media.css';
import './mobile-production.css';

const siteUrl = 'https://bfp-venue-intelligence.vercel.app';
const shareImage = 'https://images.pexels.com/photos/14528845/pexels-photo-14528845.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop';

export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1 };\n\nexport const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'NOIR DC — Venue Intelligence Demo',
  description: 'Experience the next generation of nightlife: events, table reservations, bottle service and an AI-powered VIP concierge.',
  openGraph: {
    title: 'NOIR DC — The Night Is Yours',
    description: 'Table reservations, bottle service, event tickets and an AI-powered VIP concierge for the next generation of nightlife.',
    url: siteUrl,
    siteName: 'NOIR DC',
    images: [{ url: shareImage, width: 1200, height: 630, alt: 'NOIR DC nightlife experience' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NOIR DC — The Night Is Yours',
    description: 'Table reservations, bottle service, event tickets and an AI-powered VIP concierge.',
    images: [shareImage],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
