import type { MetadataRoute } from 'next';
import { getEnv } from '@/lib/env';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getEnv().NEXT_PUBLIC_BASE_URL;
  const lastModified = new Date('2026-11-12T00:00:00Z');
  return [
    {
      url: `${baseUrl}/`,
      lastModified,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/legal/terms`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/legal/privacy`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}
