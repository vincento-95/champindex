// ============================================================
// ChampIndex — Paramètres de notifications
// ============================================================

import { useState, useEffect } from 'react';
import {
  isNotificationSupported,
  requestNotificationPermission,
  getNotificationPermission,
} from '../lib/notifications';
import { IconAlert } from './Icons';

export default function NotificationSettings() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    getNotificationPermission()
  );

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  const handleEnable = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');
  };

  if (!isNotificationSupported()) {
    return (
      <div className="px-4 py-3 rounded-xl bg-paper-raised border border-line">
        <p className="text-xs text-ink-soft">Les notifications ne sont pas supportées par ce navigateur.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 rounded-xl bg-paper-raised border border-line">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-ink flex items-center gap-1.5">
            <IconAlert size={15} className="text-moss" />
            Notifications
          </p>
          <p className="text-[11px] text-ink-soft mt-0.5">
            {permission === 'granted'
              ? 'Activées — vous serez alerté quand les conditions sont idéales'
              : permission === 'denied'
              ? 'Bloquées — activez-les dans les paramètres du navigateur'
              : 'Recevez des alertes quand les conditions de cueillette sont parfaites'}
          </p>
        </div>
        {permission === 'default' && (
          <button
            onClick={handleEnable}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-paper
              bg-moss hover:bg-moss-deep transition-colors flex-shrink-0"
          >
            Activer
          </button>
        )}
        {permission === 'granted' && (
          <span className="material-symbols-outlined text-[18px] text-moss">check</span>
        )}
        {permission === 'denied' && (
          <span className="material-symbols-outlined text-[18px] text-danger">close</span>
        )}
      </div>
    </div>
  );
}
