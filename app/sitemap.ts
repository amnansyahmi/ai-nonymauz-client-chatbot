import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://majlismate.ai';
  const lastModified = new Date();

  return [
    {
      url: `${base}/`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1
    },
    {
      url: `${base}/chat`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.9
    },
    {
      url: `${base}/embed`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5
    }
  ];
}
