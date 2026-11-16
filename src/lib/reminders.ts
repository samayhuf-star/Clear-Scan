import * as Notifications from 'expo-notifications';
import { dropReminder, getDocReminders, saveReminder } from './db';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/** 9:00 local time on the given yyyy-mm-dd, minus `daysBefore`. */
export function reminderDate(iso: string, daysBefore: number): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d - daysBefore, 9, 0, 0);
}

async function ensurePermission(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

const PLAN = [
  { daysBefore: 7, lead: 'in 7 days' },
  { daysBefore: 1, lead: 'tomorrow' },
  { daysBefore: 0, lead: 'today' },
] as const;

/** Schedules local reminders (7 days, 1 day, and on the day). Nothing leaves the phone. */
export async function addReminder(docId: string, docTitle: string, label: string, iso: string): Promise<'ok' | 'denied' | 'past'> {
  if (!(await ensurePermission())) return 'denied';
  const now = Date.now();
  const ids: string[] = [];
  for (const step of PLAN) {
    const when = reminderDate(iso, step.daysBefore);
    if (when.getTime() <= now) continue;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${label} ${step.lead}`,
        body: docTitle,
        data: { docId },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
    ids.push(id);
  }
  if (!ids.length) return 'past';
  saveReminder(docId, iso, label, ids);
  return 'ok';
}

export async function removeReminder(docId: string, iso: string, label: string) {
  const row = getDocReminders(docId).find((r) => r.iso === iso && r.label === label);
  if (row) {
    for (const id of JSON.parse(row.notif_ids) as string[]) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
  }
  dropReminder(docId, iso, label);
}

export async function clearDocReminders(docId: string) {
  for (const r of getDocReminders(docId)) await removeReminder(docId, r.iso, r.label);
}
