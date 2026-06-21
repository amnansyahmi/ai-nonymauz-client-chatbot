import type { ReactNode } from 'react';
import PwaRegister from '../../components/PwaRegister';
import PwaInstallPrompt from '../../components/mobile/PwaInstallPrompt';
import WebVitalsReporter from '../../components/ai/WebVitalsReporter';
import ShortcutsDialog from '../../components/ai/ShortcutsDialog';
import OnboardingTour from '../../components/ai/OnboardingTour';
import '../globals.css';
import '../styles/planner-overrides.css';
import '../styles/live-voice.css';
import '../styles/app-states.css';
import '../styles/dark.css';
import '../styles/mobile.css';
import '../styles/ai-features.css';
import '../styles/majlismate-theme.css';
import '../styles/dark-sweep.css';
import '../styles/dashboard.css';
import '../styles/checklist.css';
import '../styles/datepicker.css';

/**
 * Layout for the actual application surfaces (/chat, /embed, ...).
 * Theme toggle lives inside the planner sidebar profile card — not here.
 */
// Apply the saved theme before paint so the app honours it from the first frame
// (no flash) and opening the settings panel never causes a theme jump. The
// ThemeToggle still owns *changing* the theme.
const themeInit = `(function(){try{var t=localStorage.getItem('mm-theme');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}}catch(e){}})();`;

export default function AppShellLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <PwaRegister />
      <WebVitalsReporter />
      <OnboardingTour />
      <ShortcutsDialog />
      {children}
      <PwaInstallPrompt />
    </>
  );
}
