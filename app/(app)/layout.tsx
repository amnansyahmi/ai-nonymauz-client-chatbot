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

/**
 * Layout for the actual application surfaces (/chat, /embed, ...).
 * Theme toggle lives inside the planner sidebar profile card — not here.
 */
export default function AppShellLayout({ children }: { children: ReactNode }) {
  return (
    <>
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
