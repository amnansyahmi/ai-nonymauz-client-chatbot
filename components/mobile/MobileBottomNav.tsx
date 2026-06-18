'use client';

import { useState } from 'react';
import {
  MenuBudgetIcon,
  MenuCalendarIcon,
  MenuChecklistIcon,
  MenuChatIcon,
  MenuDashboardIcon,
  MenuGuestsIcon,
  MenuVendorsIcon
} from '../planner/icons';
import { MOBILE_NAV_LABELS, type MobileTab } from './types';

export type { MobileTab } from './types';
export { MOBILE_NAV_TABS, MOBILE_NAV_LABELS } from './types';

type MobileBottomNavProps = {
  activeTab: MobileTab;
  onChange: (tab: MobileTab) => void;
  language?: 'ms' | 'en';
};

/**
 * Mobile-only bottom tab bar. Hidden on desktop (CSS). The order is
 * chosen so the primary action (chat) is in the centre, matching the
 * pattern users expect from messaging apps.
 */
export default function MobileBottomNav({ activeTab, onChange, language = 'ms' }: MobileBottomNavProps) {
  const [hoveredTab, setHoveredTab] = useState<MobileTab | null>(null);
  const t = MOBILE_NAV_LABELS[language];

  const items: Array<{ id: MobileTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: t.dashboard, icon: <MenuDashboardIcon size={22} /> },
    { id: 'checklist', label: t.checklist, icon: <MenuChecklistIcon size={22} /> },
    { id: 'chat', label: t.chat, icon: <MenuChatIcon size={22} /> },
    { id: 'budget', label: t.budget, icon: <MenuBudgetIcon size={22} /> },
    { id: 'rsvp', label: t.rsvp, icon: <MenuGuestsIcon size={22} /> }
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Primary">
      {items.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`mobile-bottom-nav__item ${isActive ? 'is-active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
            onClick={() => onChange(item.id)}
            onMouseEnter={() => setHoveredTab(item.id)}
            onMouseLeave={() => setHoveredTab(null)}
            onFocus={() => setHoveredTab(item.id)}
            onBlur={() => setHoveredTab(null)}
            data-event={`mobile_tab_${item.id}`}
            title={hoveredTab === item.id ? item.label : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// Re-export the calendar + vendors icons so consumers can build their own navs.
export { MenuCalendarIcon, MenuVendorsIcon };
