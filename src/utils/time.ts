// Time formatting utilities

import i18n from '../i18n/config';

export function formatTime(timestamp?: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = Date.now();
  const diff = now - timestamp;

  // Less than 1 minute
  if (diff < 60000) {
    return i18n.t('time.justNow');
  }

  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return i18n.t('time.minutesAgo', { count: minutes });
  }

  // Less than 24 hours
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return i18n.t('time.hoursAgo', { count: hours });
  }

  // More than 24 hours
  return date.toLocaleString();
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export function formatISOTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}
