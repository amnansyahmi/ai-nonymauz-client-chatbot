'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Dashboard', icon: '📊', exact: true },
  { href: '/admin/affiliates', label: 'Affiliates', icon: '🤝' },
  { href: '/admin/commissions', label: 'Komisen', icon: '💰' },
  { href: '/admin/payouts', label: 'Bayaran', icon: '🏦' },
  { href: '/admin/customers', label: 'Pelanggan', icon: '👥' },
  { href: '/admin/reports', label: 'Laporan', icon: '📈' },
  { href: '/admin/settings', label: 'Tetapan', icon: '⚙️' }
];

type Props = {
  email: string;
  role: 'superuser' | 'admin';
  logoutAction: () => void;
};

export default function AdminNav({ email, role, logoutAction }: Props) {
  const pathname = usePathname();
  const links = role === 'superuser'
    ? [...LINKS, { href: '/admin/admins', label: 'Pentadbir', icon: '🛡️' }]
    : LINKS;

  return (
    <nav className="admin__nav" aria-label="Admin">
      <ul>
        {links.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link href={link.href} className={active ? 'is-active' : ''}>
                <span aria-hidden="true">{link.icon}</span>
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="admin__nav-foot">
        <span className="admin__nav-email">{email}{role === 'superuser' ? ' · super' : ''}</span>
        <form action={logoutAction}>
          <button type="submit">Log keluar</button>
        </form>
      </div>
    </nav>
  );
}
