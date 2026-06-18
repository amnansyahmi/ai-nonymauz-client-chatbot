import SetupWizard from '../../../components/ai/SetupWizard';

export const metadata = {
  title: 'Setup Majlis - MajlisMate.ai'
};

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const params = await searchParams;
  const language = params.lang === 'en' ? 'en' : 'ms';
  return <SetupWizard language={language} />;
}