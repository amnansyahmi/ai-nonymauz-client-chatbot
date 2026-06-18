import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/chat'],
        disallow: ['/api/']
      }
    ],
    sitemap: 'https://majlismate.ai/sitemap.xml'
  };
}
