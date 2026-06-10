// ============================================================
// ChampIndex — Notifications locales
// Vérifie les conditions au lancement et affiche des notifications
// natives si les conditions matchent des alertes.
// Pas de backend — tout est local.
// ============================================================

import { matchAlerts } from './alert-engine';
import type { HeatmapStats } from './heatmap-api';

const NOTIF_STORAGE_KEY = 'champindex_last_notif';
const MIN_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h entre notifications

export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Vérifie les alertes et envoie une notification native si pertinent.
 * Appelé au lancement de l'app (max 1 notif / 6h).
 */
export function checkAndNotify(stats: HeatmapStats): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;

  // Throttle : max 1 notif / 6h
  const lastNotif = localStorage.getItem(NOTIF_STORAGE_KEY);
  if (lastNotif && Date.now() - parseInt(lastNotif) < MIN_INTERVAL_MS) return;

  const alerts = matchAlerts(stats);
  const topAlert = alerts.find(a => a.relevance >= 60 && a.alert.reliability !== 'low');
  if (!topAlert) return;

  const { alert } = topAlert;

  new Notification(`🍄 ${alert.targetSpecies}`, {
    body: alert.appMessage + `\n📍 ${alert.whereToLook}`,
    icon: '/favicon.svg',
    tag: 'champindex-alert', // remplace la précédente
    silent: false,
  });

  localStorage.setItem(NOTIF_STORAGE_KEY, String(Date.now()));
}
