export type MobileTab = 'chat' | 'dashboard' | 'checklist' | 'calendar' | 'budget' | 'rsvp' | 'vendors';

export const MOBILE_NAV_TABS: ReadonlyArray<MobileTab> = ['dashboard', 'checklist', 'chat', 'budget', 'rsvp', 'vendors'];

export const MOBILE_NAV_LABELS: Record<'ms' | 'en', Record<MobileTab, string>> = {
  ms: {
    chat: 'Chat',
    dashboard: 'Utama',
    checklist: 'Senarai',
    calendar: 'Kalendar',
    budget: 'Bajet',
    rsvp: 'Tetamu',
    vendors: 'Vendor'
  },
  en: {
    chat: 'Chat',
    dashboard: 'Home',
    checklist: 'Tasks',
    calendar: 'Calendar',
    budget: 'Budget',
    rsvp: 'Guests',
    vendors: 'Vendors'
  }
};
