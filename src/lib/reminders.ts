import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { dropReminder, getDocReminders, saveReminder, type Repeat } from './db';
import { syncWidget } from './widget';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

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
  { daysBefore: 30, lead: 'in 30 days' },
  { daysBefore: 7, lead: 'in 7 days' },
  { daysBefore: 1, lead: 'tomorrow' },
  { daysBefore: 0, lead: 'today' },
] as const;

/**
 * Schedules local reminders (30 days, 7 days, 1 day, and on the day). Nothing leaves the phone.
 * "yearly" and "monthly" reminders repeat on their own, so renewals never need setting up twice.
 */
export async function addReminder(
  docId: string,
  docTitle: string,
  label: string,
  iso: string,
  repeat: Repeat = 'none'
): Promise<'ok' | 'denied' | 'past'> {
  if (Platform.OS === 'web') {
    saveReminder(docId, iso, label, [], repeat);
    return 'ok';
  }
  if (!(await ensurePermission())) return 'denied';
  const now = Date.now();
  const ids: string[] = [];
  for (const step of PLAN) {
    const when = reminderDate(iso, step.daysBefore);
    const content = { title: `${label} ${step.lead}`, body: docTitle, data: { docId } };
    if (repeat === 'yearly') {
      ids.push(await Notifications.scheduleNotificationAsync({
        content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.YEARLY, month: when.getMonth(), day: when.getDate(), hour: 9, minute: 0 },
      }));
    } else if (repeat === 'monthly') {
      ids.push(await Notifications.scheduleNotificationAsync({
        content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.MONTHLY, day: Math.min(when.getDate(), 28), hour: 9, minute: 0 },
      }));
    } else {
      if (when.getTime() <= now) continue;
      ids.push(await Notifications.scheduleNotificationAsync({
        content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
      }));
    }
  }
  if (!ids.length) return 'past';
  saveReminder(docId, iso, label, ids, repeat);
  await syncWidget();
  return 'ok';
}

export async function removeReminder(docId: string, iso: string, label: string) {
  const row = getDocReminders(docId).find((r) => r.iso === iso && r.label === label);
  if (row) {
    for (const id of Platform.OS === 'web' ? [] : (JSON.parse(row.notif_ids) as string[])) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
  }
  dropReminder(docId, iso, label);
  await syncWidget();
}

export async function clearDocReminders(docId: string) {
  for (const r of getDocReminders(docId)) await removeReminder(docId, r.iso, r.label);
}
