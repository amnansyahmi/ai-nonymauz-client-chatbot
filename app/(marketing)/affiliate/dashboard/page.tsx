import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '../../../../auth';
import { createOrGetAffiliate, getDashboardData } from '../../../../lib/affiliate/queries';
import AffiliateDashboard from '../../../../components/affiliate/AffiliateDashboard';

export const metadata: Metadata = {
  title: 'Dashboard Affiliate — MajlisMate.ai',
  description: 'Pantau klik, rujukan, komisen dan bayaran affiliate anda.'
};

// Always read fresh data from the database.
export const dynamic = 'force-dynamic';

export default async function AffiliateDashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect('/affiliate/login');

  const userName = session.user.name || session.user.email.split('@')[0];
  const userEmail = session.user.email;

  // Auto-provision a pending affiliate on first visit so the dashboard always
  // resolves to a real record (an email maps to exactly one affiliate).
  const affiliate = await createOrGetAffiliate({
    name: userName,
    email: userEmail,
    userId: session.user.id ?? null
  });

  const data = await getDashboardData(affiliate);

  return <AffiliateDashboard user={{ name: userName, email: userEmail }} data={data} />;
}
