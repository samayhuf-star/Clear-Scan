import { kvGet, kvSet } from './db';

export type Look = 'auto' | 'color' | 'grey' | 'bw';
export const LOOKS: { key: Look; label: string }[] = [
  { key: 'auto', label: 'Auto' },
  { key: 'color', label: 'Colour' },
  { key: 'grey', label: 'Grey' },
  { key: 'bw', label: 'B&W' },
];

export function getLook(docId: string): Look {
  const v = kvGet(`look:${docId}`);
  return v === 'color' || v === 'grey' || v === 'bw' ? v : 'auto';
}
export function setLook(docId: string, look: Look) {
  kvSet(`look:${docId}`, look);
}

/** CSS filter used when building the PDF. */
export function cssFilter(look: Look): string {
  if (look === 'auto') return 'contrast(1.14) brightness(1.05) saturate(1.06)';
  if (look === 'grey') return 'grayscale(1)';
  if (look === 'bw') return 'grayscale(1) contrast(2.2) brightness(1.08)';
  return 'none';
}

/** React Native filter style for on-screen preview. */
export function rnFilter(look: Look): any[] | undefined {
  if (look === 'auto') return [{ contrast: 1.14 }, { brightness: 1.05 }, { saturate: 1.06 }];
  if (look === 'grey') return [{ grayscale: 1 }];
  if (look === 'bw') return [{ grayscale: 1 }, { contrast: 2.2 }, { brightness: 1.08 }];
  return undefined;
}
