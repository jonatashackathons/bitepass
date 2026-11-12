import type { MetadataRoute } from 'next';
import { getEnv } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getEnv().NEXT_PUBLIC_BASE_URL;
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/legal/terms', '/legal/privacy'],
        disallow: ['/api/', '/merchant'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
