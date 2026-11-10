export const KINDS = ['Receipt', 'Invoice', 'ID', 'Letter', 'Document'] as const;
export type Kind = (typeof KINDS)[number];

const RULES: { kind: Kind; words: RegExp }[] = [
  { kind: 'Receipt', words: /\b(receipt|subtotal|change due|cashier|thank you for shopping|card ending|total paid)\b/i },
  { kind: 'Invoice', words: /\b(invoice|bill to|due date|amount due|gstin|tax invoice|purchase order|balance due)\b/i },
  { kind: 'ID', words: /\b(passport|driving licen[cs]e|aadhaar|pan card|date of birth|dob|identity card|nationality|voter)\b/i },
  { kind: 'Letter', words: /\b(dear |sincerely|yours faithfully|regards,|to whom it may concern)\b/i },
];

export function classify(text: string): Kind {
  for (const r of RULES) if (r.words.test(text)) return r.kind;
  return 'Document';
}

const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function fmtDate(ms: number): string {
  return DATE.format(new Date(ms));
}

/** Names a scan from its own text, e.g. "Tax Invoice 14 Oct 2026". Falls back to a dated name. */
export function smartTitle(text: string, ms: number): string {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/[^\p{L}\p{N} &.,'-]/gu, ' ').replace(/\s+/g, ' ').trim())
    .filter((l) => /\p{L}{3,}/u.test(l) && l.length >= 4 && l.length <= 48);
  const first = lines[0];
  const day = fmtDate(ms);
  return first ? `${first} · ${day}` : `Scan · ${day}`;
}
