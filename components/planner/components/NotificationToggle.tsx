'use client';

import { useEffect, useState } from 'react';
import type { AppLanguage } from '../types';
import {
  notificationPermission,
  notificationsSupported,
  requestNotificationPermission
} from '../../../lib/notifications';

type Props = {
  language: AppLanguage;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
};

export default function NotificationToggle({ language, enabled, onChange }: Props) {
  const isMs = language === 'ms';
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    setPermission(notificationPermission());
  }, []);

  if (!notificationsSupported() || permission === 'unsupported') return null;

  const active = enabled && permission === 'granted';

  async function toggle() {
    if (active) {
      onChange(false);
      return;
    }
    let perm = permission;
    if (perm !== 'granted') {
      perm = await requestNotificationPermission();
      setPermission(perm);
    }
    if (perm === 'granted') onChange(true);
  }

  const blocked = permission === 'denied';

  return (
    <div className={`notify-toggle${active ? ' is-on' : ''}`}>
      <span className="notify-toggle__icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
      </span>
      <span className="notify-toggle__text">
        {blocked
          ? isMs ? 'Peringatan disekat dalam pelayar' : 'Notifications blocked in browser'
          : active
            ? isMs ? 'Peringatan dihidupkan' : 'Reminders on'
            : isMs ? 'Hidupkan peringatan task & appointment' : 'Turn on task & appointment reminders'}
      </span>
      {!blocked ? (
        <button type="button" className="notify-toggle__btn" onClick={toggle}>
          {active ? (isMs ? 'Matikan' : 'Turn off') : (isMs ? 'Hidupkan' : 'Turn on')}
        </button>
      ) : null}
    </div>
  );
}
