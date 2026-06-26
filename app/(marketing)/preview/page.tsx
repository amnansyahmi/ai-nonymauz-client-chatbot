import type { Metadata } from 'next';
import PreviewFunnel from '@/components/preview/PreviewFunnel';

export const metadata: Metadata = {
  title: 'Cuba MajlisMate.ai — Preview Checklist Percuma',
  description:
    'Jana checklist majlis kahwin percuma dengan AI. Lihat bagaimana MajlisMate.ai membantu anda merancang majlis.'
};

export default function PreviewPage() {
  return (
    <main className="preview-funnel">
      <PreviewFunnel />
    </main>
  );
}
