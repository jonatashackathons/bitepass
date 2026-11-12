import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BitePass — Autonomous Culinary Concierge',
    short_name: 'BitePass',
    description:
      'Skip the 22-minute lunch queue with Gemini 4 Argon recommendations, 2-phase PayPal escrow, and <=50m doorstep settlement.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAF9F5',
    theme_color: '#FAF9F5',
    icons: [
      {
        src: '/images/turkey_club.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
    ],
  };
}

