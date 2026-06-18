import type { ReactNode } from 'react';
import '../globals.css';
import '../styles/app-states.css';
import '../styles/dark.css';
import '../styles/marketing.css';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
