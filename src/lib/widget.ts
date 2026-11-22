import { Platform } from 'react-native';
import { listReminders } from './db';

function daysUntil(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((new Date(y, m - 1, d).getTime() - today) / 86400000);
}

/** Pushes the next three deadlines to the home-screen widget. Safe to call anywhere; it never throws. */
export async function syncWidget(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const items = listReminders()
      .map((r) => ({ title: r.title, label: r.label, days: daysUntil(r.iso) }))
      .filter((r) => r.days >= 0)
      .sort((a, b) => a.days - b.days)
      .slice(0, 3);
    // Loaded lazily so the app still runs where the widget module is unavailable (Expo Go, web).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const widget = require('../../widgets/UpcomingWidget').default;
    widget.updateSnapshot({ items });
  } catch {
    // widget unavailable in this build
  }
}
