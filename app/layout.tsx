import type { Metadata, Viewport } from 'next';
import PwaRegister from '../components/PwaRegister';
import './globals.css';

export const metadata: Metadata = {
  title: 'MajlisMate.ai',
  description: 'An installable AI wedding planner PWA for majlis planning, checklists, vendors, and appointments.',
  applicationName: 'MajlisMate.ai',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'MajlisMate.ai',
    statusBarStyle: 'default'
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg'
  }
};

export const viewport: Viewport = {
  themeColor: '#241c18',
  colorScheme: 'light'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ms">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
