import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MajlisMate.ai',
    short_name: 'MajlisMate',
    description: 'A PWA wedding planner chatbot for majlis planning, checklists, vendors, and calendar appointments.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fdf9f5',
    theme_color: '#2a201b',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable'
      }
    ]
  };
}
