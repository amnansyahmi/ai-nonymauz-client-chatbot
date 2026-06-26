import type { ReactNode } from 'react';
import Link from 'next/link';
import { requireAdmin } from '../../../lib/admin/session';
import { adminLogout } from '../admin-login/actions';
import AdminNav from '../../../components/admin/AdminNav';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="admin">
      <aside className="admin__sidebar">
        <Link href="/admin" className="admin__brand">
          <strong>MajlisMate.ai</strong>
          <span className="admin__brand-tag">Admin</span>
        </Link>
        <AdminNav email={admin.email} role={admin.role} logoutAction={adminLogout} />
      </aside>
      <main className="admin__main">{children}</main>
    </div>
  );
}
