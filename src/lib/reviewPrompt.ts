import * as FS from 'expo-file-system/legacy';
import * as StoreReview from 'expo-store-review';

// Ask for an App Store rating after a real success moment (ASO plan, 27 Nov 2026).
// Apple caps the system prompt at 3 per year; we also wait for `minWins` successes and keep asks 30+ days apart.
const PATH = (FS.documentDirectory ?? '') + 'review-prompt.json';
type S = { wins: number; asks: number; lastAsk: number };
const DAY = 24 * 60 * 60 * 1000;

export async function noteSuccess(minWins = 2): Promise<void> {
  try {
    const info = await FS.getInfoAsync(PATH);
    const s: S = info.exists ? JSON.parse(await FS.readAsStringAsync(PATH)) : { wins: 0, asks: 0, lastAsk: 0 };
    s.wins += 1;
    const due = s.wins >= minWins && s.asks < 3 && Date.now() - s.lastAsk > 30 * DAY;
    if (due && (await StoreReview.hasAction())) {
      s.asks += 1;
      s.lastAsk = Date.now();
      setTimeout(() => { StoreReview.requestReview().catch(() => {}); }, 900);
    }
    await FS.writeAsStringAsync(PATH, JSON.stringify(s));
  } catch {
    // never block the user flow on a rating prompt
  }
}
