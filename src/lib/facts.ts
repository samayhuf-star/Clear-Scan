/**
 * "Facts": pulls the useful details out of a scan's recognised text, entirely on-device.
 * Dates (with deadline/expiry detection), amounts, contacts and sensitive ID numbers.
 */

export type FactKind = 'date' | 'amount' | 'email' | 'phone' | 'url' | 'id';

export type Fact = {
  kind: FactKind;
  /** Short human label, e.g. "Expires", "Total", "PAN". */
  label: string;
  /** The text exactly as it appears in the scan. */
  value: string;
  /** yyyy-mm-dd for dates. */
  iso?: string;
  /** True for dates that look like an expiry, due date or renewal, which can get a reminder. */
  deadline?: boolean;
  /** True for ID and card numbers that "share-safe" mode hides. */
  sensitive?: boolean;
};

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function validIso(y: number, m: number, d: number): string | null {
  if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const year4 = (y: string) => (y.length === 2 ? 2000 + Number(y) : Number(y));

const MON = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';

const DATE_PATTERNS: { re: RegExp; parse: (m: RegExpExecArray) => string | null }[] = [
  // 2026-10-14
  { re: /\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/g, parse: (m) => validIso(Number(m[1]), Number(m[2]), Number(m[3])) },
  // 14/10/2026, 14-10-26 (day first)
  { re: /\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})\b/g, parse: (m) => validIso(year4(m[3]), Number(m[2]), Number(m[1])) },
  // 14 Oct 2026, 14th October, 2026
  { re: new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?[ -]${MON}\\.?,?[ -](\\d{4})\\b`, 'gi'), parse: (m) => validIso(Number(m[3]), MONTHS[m[2].toLowerCase()], Number(m[1])) },
  // Oct 14, 2026
  { re: new RegExp(`\\b${MON}\\.? (\\d{1,2})(?:st|nd|rd|th)?,? (\\d{4})\\b`, 'gi'), parse: (m) => validIso(Number(m[3]), MONTHS[m[1].toLowerCase()], Number(m[2])) },
];

const EXPIRY_WORDS = /(expir\w*|valid (?:until|till|thru|through|upto|up to)|valid to|renew\w*|due(?: date| on| by)?|pay by|end date|good until)/i;
const ISSUE_WORDS = /(issu\w*|date of birth|dob|born|invoice date|dated|date of issue)/i;

function dateLabel(before: string): { label: string; deadline: boolean } {
  const ctx = before.slice(-34);
  if (/due/i.test(ctx) && !/expir/i.test(ctx)) return { label: 'Due', deadline: true };
  if (/renew/i.test(ctx)) return { label: 'Renews', deadline: true };
  if (EXPIRY_WORDS.test(ctx)) return { label: 'Expires', deadline: true };
  if (/date of birth|dob|born/i.test(ctx)) return { label: 'Born', deadline: false };
  if (ISSUE_WORDS.test(ctx)) return { label: 'Issued', deadline: false };
  return { label: 'Date', deadline: false };
}

function luhn(digits: string): boolean {
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

const AMOUNT = /(?:₹|Rs\.?|INR|US\$|\$|USD|€|EUR|£|GBP)\s?\d[\d,]*(?:\.\d{1,2})?/g;

type Span = { start: number; end: number };
const overlaps = (a: Span, spans: Span[]) => spans.some((b) => a.start < b.end && b.start < a.end);

export function extractFacts(text: string): Fact[] {
  const facts: Fact[] = [];
  const used: Span[] = [];
  const seen = new Set<string>();
  const push = (f: Fact, span: Span) => {
    const key = `${f.kind}|${f.value}`;
    if (seen.has(key)) return;
    seen.add(key);
    used.push(span);
    facts.push(f);
  };

  // Sensitive IDs first so their digits are not mistaken for phones or dates.
  for (const m of text.matchAll(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{1,7}\b/g)) {
    const digits = m[0].replace(/\D/g, '');
    if (digits.length >= 13 && digits.length <= 19 && luhn(digits)) {
      push({ kind: 'id', label: 'Card number', value: m[0], sensitive: true }, { start: m.index!, end: m.index! + m[0].length });
    }
  }
  for (const m of text.matchAll(/\b\d{4} \d{4} \d{4}\b/g)) {
    const span = { start: m.index!, end: m.index! + m[0].length };
    if (!overlaps(span, used)) push({ kind: 'id', label: 'Aadhaar', value: m[0], sensitive: true }, span);
  }
  for (const m of text.matchAll(/\b[A-Z]{5}\d{4}[A-Z]\b/g)) {
    push({ kind: 'id', label: 'PAN', value: m[0], sensitive: true }, { start: m.index!, end: m.index! + m[0].length });
  }
  for (const m of text.matchAll(/\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/g)) {
    push({ kind: 'id', label: 'GSTIN', value: m[0], sensitive: false }, { start: m.index!, end: m.index! + m[0].length });
  }
  for (const m of text.matchAll(/\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){3,7}(?: ?[A-Z0-9]{1,3})?\b/g)) {
    push({ kind: 'id', label: 'IBAN', value: m[0], sensitive: true }, { start: m.index!, end: m.index! + m[0].length });
  }

  for (const m of text.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)) {
    push({ kind: 'email', label: 'Email', value: m[0] }, { start: m.index!, end: m.index! + m[0].length });
  }
  for (const m of text.matchAll(/\bhttps?:\/\/[^\s)]+|\bwww\.[^\s)]+/gi)) {
    push({ kind: 'url', label: 'Link', value: m[0].replace(/[.,;]+$/, '') }, { start: m.index!, end: m.index! + m[0].length });
  }

  for (const { re, parse } of DATE_PATTERNS) {
    for (const m of text.matchAll(re)) {
      const span = { start: m.index!, end: m.index! + m[0].length };
      if (overlaps(span, used)) continue;
      const iso = parse(m as RegExpExecArray);
      if (!iso) continue;
      const lineStart = text.lastIndexOf('\n', span.start) + 1;
      const { label, deadline } = dateLabel(text.slice(lineStart, span.start));
      push({ kind: 'date', label, value: m[0], iso, deadline }, span);
    }
  }

  for (const m of text.matchAll(/(?<![\d\w])(?:\+\d{1,3}[ -]?)?(?:\(?\d{2,5}\)?[ -]?)?\d{3,5}[ -]?\d{4,6}(?![\d\w])/g)) {
    const span = { start: m.index!, end: m.index! + m[0].length };
    const digits = m[0].replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 13 || overlaps(span, used)) continue;
    push({ kind: 'phone', label: 'Phone', value: m[0].trim() }, span);
  }

  for (const m of text.matchAll(AMOUNT)) {
    const span = { start: m.index!, end: m.index! + m[0].length };
    if (overlaps(span, used)) continue;
    const lineStart = text.lastIndexOf('\n', span.start) + 1;
    const before = text.slice(lineStart, span.start);
    const label = /\b(grand total|total|amount due|balance due|net payable|amount payable)/i.test(before) ? 'Total' : 'Amount';
    push({ kind: 'amount', label, value: m[0] }, span);
  }

  return facts;
}

/** Deadline-style dates that are still in the future (or today). */
export function upcomingDeadlines(facts: Fact[], now = new Date()): Fact[] {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return facts.filter((f) => f.kind === 'date' && f.deadline && f.iso && f.iso >= today);
}

/** Masks a number but keeps the last four characters, e.g. "•••• •••• 4321". */
export function maskValue(value: string): string {
  const keep = 4;
  const chars = [...value];
  let seen = 0;
  for (let i = chars.length - 1; i >= 0; i--) {
    if (/[A-Za-z0-9]/.test(chars[i])) {
      seen++;
      if (seen > keep) chars[i] = '•';
    }
  }
  return chars.join('');
}

/** Share-safe text: hides card numbers, Aadhaar, PAN and IBANs (last four kept). */
export function redactText(text: string): { text: string; hidden: number } {
  let out = text;
  let hidden = 0;
  const sensitive = extractFacts(text).filter((f) => f.sensitive);
  for (const f of sensitive) {
    if (out.includes(f.value)) {
      out = out.split(f.value).join(maskValue(f.value));
      hidden++;
    }
  }
  return { text: out, hidden };
}
