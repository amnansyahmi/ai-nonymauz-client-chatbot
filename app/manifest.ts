import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MajlisMate.ai',
    short_name: 'MajlisMate',
    description: 'A PWA wedding planner chatbot for majlis planning, checklists, vendors, and calendar appointments.',
    start_url: '/chat',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#fbf7f2',
    theme_color: '#241c18',
    categories: ['productivity', 'lifestyle'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable'
      }
    ],
    shortcuts: [
      {
        name: 'Open chat',
        short_name: 'Chat',
        description: 'Ask MajlisMate about your wedding plan.',
        url: '/chat'
      },
      {
        name: 'Wedding checklist',
        short_name: 'Checklist',
        description: 'Open MajlisMate and review checklist tasks.',
        url: '/chat?tab=checklist'
      },
      {
        name: 'Wedding calendar',
        short_name: 'Calendar',
        description: 'Open MajlisMate and review appointments.',
        url: '/chat?tab=calendar'
      }
    ]
  };
}
