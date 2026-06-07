import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI-nonymauz Client Chatbot',
  description: 'Company knowledge bot and website support chatbot powered by AI-nonymauz.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
