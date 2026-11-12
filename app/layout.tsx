import type { Metadata, Viewport } from 'next';
import { getEnv } from '@/lib/env';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FAF9F5',
};

export function generateMetadata(): Metadata {
  const baseUrl = getEnv().NEXT_PUBLIC_BASE_URL;
  return {
    metadataBase: new URL(baseUrl),
    title: 'BitePass — Autonomous Culinary Agent',
    description:
      'Effortless walk-up lunch ordering powered by Gemini 4 Argon, 2-phase PayPal escrow authorization, and live AG Grid kitchen orchestration.',
    manifest: '/manifest.webmanifest',
    openGraph: {
      title: 'BitePass — Autonomous Culinary Agent',
      description:
        'Skip the 22-minute lunch queue. Proactive calendar-aware recommendations, 1-tap PayPal escrow holds, and <=50m doorstep settlement.',
      type: 'website',
      url: baseUrl,
      images: [
        {
          url: '/images/turkey_club.jpg',
          width: 1200,
          height: 630,
          alt: 'BitePass Artisan Culinary Preview',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'BitePass — Autonomous Culinary Agent',
      description:
        'Proactive Gemini 4 Argon dining concierge with 2-phase PayPal escrow and <=50m doorstep auto-capture.',
      images: ['/images/turkey_club.jpg'],
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-culinary-bg">
      <body className="min-h-screen bg-culinary-bg text-culinary-text antialiased selection:bg-culinary-terracottaFill selection:text-white font-sans">
        {children}
      </body>
    </html>
  );
}
