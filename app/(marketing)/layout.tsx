import type { ReactNode } from 'react';
import '../globals.css';
import '../styles/ui.css';
import '../styles/app-states.css';
import '../styles/dark.css';
import '../styles/marketing.css';
import '../styles/majlismate-theme.css';
import '../styles/ai-features.css';
import '../styles/datepicker.css';
import '../styles/mobile-app.css';

// Mark the document as JS-capable before paint so scroll-reveal elements start
// hidden only when we can actually reveal them (no flash / no stuck-hidden
// content if JS is unavailable).
const animInit = `(function(){try{document.documentElement.classList.add('mm-anim');}catch(e){}})();`;

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: animInit }} />
      {children}
    </>
  );
}
