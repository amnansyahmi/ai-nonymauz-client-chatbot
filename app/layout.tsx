import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'MajlisMate.ai',
    template: '%s — MajlisMate.ai'
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://majlismate.ai'),
  description:
    'MajlisMate.ai ialah pembantu AI untuk merancang majlis kahwin. Senarai semak pintar, bajet, vendor dan voice mode dalam satu aplikasi.',
  applicationName: 'MajlisMate.ai',
  keywords: ['wedding planner', 'majlis kahwin', 'AI assistant', 'ToyyibPay', 'Malaysia']
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#241c18' },
    { media: '(prefers-color-scheme: dark)', color: '#1b1410' }
  ],
  colorScheme: 'light dark'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ms">
      <body>
        {children}
      </body>
    </html>
  );
}
