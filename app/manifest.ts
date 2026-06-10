import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MajlisMate.ai',
    short_name: 'MajlisMate',
    description: 'A PWA wedding planner chatbot for majlis planning, checklists, vendors, and calendar appointments.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fbf7f2',
    theme_color: '#241c18',
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
