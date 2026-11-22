import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';

/** Adds an all-day event for a deadline to the iPhone Calendar (write-only access). */
export async function addToCalendar(docTitle: string, label: string, iso: string): Promise<'ok' | 'denied' | 'unsupported'> {
  if (Platform.OS !== 'ios') return 'unsupported';
  const { status } = await Calendar.requestCalendarPermissions(true);
  if (status !== 'granted') return 'denied';
  const [y, m, d] = iso.split('-').map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  const calendar = Calendar.getDefaultCalendarSync();
  await calendar.createEvent({
    title: `${label}: ${docTitle}`,
    notes: 'Added from Keptly',
    startDate: start,
    endDate: end,
    allDay: true,
    alarms: [{ relativeOffset: -7 * 24 * 60 }, { relativeOffset: -24 * 60 }],
  });
  return 'ok';
}
