// ============================================================
// ChampIndex — Paramètres de notifications
// ============================================================

import { useState, useEffect } from 'react';
import {
  isNotificationSupported,
  requestNotificationPermission,
  getNotificationPermission,
} from '../lib/notifications';

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
      <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/5">
        <p className="text-xs text-white/40">Les notifications ne sont pas supportées par ce navigateur.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white/90">🔔 Notifications</p>
          <p className="text-[11px] text-white/40 mt-0.5">
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
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-300
              bg-emerald-700/30 hover:bg-emerald-700/50 transition-colors flex-shrink-0"
          >
            Activer
          </button>
        )}
        {permission === 'granted' && (
          <span className="text-emerald-400 text-sm">✓</span>
        )}
        {permission === 'denied' && (
          <span className="text-red-400 text-sm">✕</span>
        )}
      </div>
    </div>
  );
}
