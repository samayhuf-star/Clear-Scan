// Web preview build only. The phone app uses SQLite (db.ts); the browser preview keeps a small
// in-memory set of sample scans so every screen can be tried without a device.
export type Doc = { id: string; title: string; kind: string; created: number; pages: number; favorite: number };
export type PageRow = { doc_id: string; idx: number; image: string; text: string };
export type Repeat = 'none' | 'monthly' | 'yearly';
export type Reminder = { doc_id: string; iso: string; label: string; notif_ids: string; repeat: Repeat };

const kv = new Map<string, string>();
const docs: Doc[] = [];
const pages: PageRow[] = [];
const reminders: Reminder[] = [];

const DAY = 86400000;
const iso = (offsetDays: number) => {
  const d = new Date(Date.now() + offsetDays * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const human = (offsetDays: number) => {
  const d = new Date(Date.now() + offsetDays * DAY);
  return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear()}`;
};

function paper(title: string, accent: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800"><rect width="600" height="800" fill="#fff"/><rect x="48" y="56" width="${220 + title.length * 4}" height="26" rx="13" fill="${accent}"/>${Array.from({ length: 14 }, (_, i) => `<rect x="48" y="${130 + i * 44}" width="${i % 5 === 4 ? 260 : 504 - (i % 3) * 40}" height="14" rx="7" fill="#D5E4E1"/>`).join('')}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function seed() {
  const add = (id: string, title: string, kind: string, ageDays: number, text: string, accent: string) => {
    docs.push({ id, title, kind, created: Date.now() - ageDays * DAY, pages: 1, favorite: 0 });
    pages.push({ doc_id: id, idx: 0, image: paper(title, accent), text });
  };
  add('demo-passport', 'Passport', 'ID', 2, `REPUBLIC OF INDIA\nPassport No: Z1234567\nDate of Birth: 02/03/1990\nDate of Expiry: ${human(12)}\nPAN ABCDE1234F`, '#0E8F7E');
  add('demo-policy', 'Car insurance policy', 'Letter', 5, `Policy renewal notice\nPremium payable: ₹18,450\nRenewal date: ${human(21)}\nHelpline: support@insureco.com`, '#FFA13F');
  add('demo-lease', 'Lease agreement', 'Document', 9, `Monthly rent ₹42,000\nLease end date: ${human(120)}\nLandlord: a.sharma@mail.com\nAadhaar 4821 5533 9012`, '#2FC4AE');
  add('demo-r1', 'Cafe receipt', 'Receipt', 1, `Blue Door Cafe\nCoffee ₹120\nCake ₹200\nGrand total ₹320`, '#3DD08A');
  add('demo-r2', 'Grocery bill', 'Receipt', 3, `Fresh Mart\nVegetables ₹640\nGrand total ₹1,280`, '#3DD08A');
  add('demo-inv', 'Electricity bill', 'Invoice', 4, `State Power Board\nAmount due ₹2,760\nDue date: ${human(6)}`, '#FFA13F');
  reminders.push(
    { doc_id: 'demo-passport', iso: iso(12), label: 'Expires', notif_ids: '[]', repeat: 'none' },
    { doc_id: 'demo-inv', iso: iso(6), label: 'Due', notif_ids: '[]', repeat: 'monthly' },
    { doc_id: 'demo-policy', iso: iso(21), label: 'Renews', notif_ids: '[]', repeat: 'yearly' }
  );
}
seed();

export function kvGet(k: string): string | null { return kv.get(k) ?? null; }
export function kvSet(k: string, v: string) { kv.set(k, v); }

export function insertDoc(doc: Doc, pgs: { image: string; text: string }[]) {
  docs.push({ ...doc, pages: pgs.length });
  pgs.forEach((p, i) => pages.push({ doc_id: doc.id, idx: i, image: p.image, text: p.text }));
}

export function appendPages(docId: string, pgs: { image: string; text: string }[]) {
  const start = getPages(docId).length;
  pgs.forEach((p, i) => pages.push({ doc_id: docId, idx: start + i, image: p.image, text: p.text }));
  const d = getDoc(docId); if (d) d.pages = start + pgs.length;
}

export function listDocs(opts: { query?: string; kind?: string; favorites?: boolean } = {}): Doc[] {
  const q = opts.query?.trim().toLowerCase();
  return docs
    .filter((d) => (!opts.kind || d.kind === opts.kind) && (!opts.favorites || d.favorite === 1))
    .filter((d) => !q || d.title.toLowerCase().includes(q) || pages.some((p) => p.doc_id === d.id && p.text.toLowerCase().includes(q)))
    .sort((a, b) => b.created - a.created);
}
export const getDoc = (id: string): Doc | null => docs.find((d) => d.id === id) ?? null;
export const getPages = (id: string): PageRow[] => pages.filter((p) => p.doc_id === id).sort((a, b) => a.idx - b.idx);
export const countDocs = () => docs.length;
export function setTitle(id: string, title: string) { const d = getDoc(id); if (d) d.title = title; }
export function setFavorite(id: string, fav: boolean) { const d = getDoc(id); if (d) d.favorite = fav ? 1 : 0; }
export function setKind(id: string, kind: string) { const d = getDoc(id); if (d) d.kind = kind; }

export function listReminders(): (Reminder & { title: string })[] {
  return reminders
    .map((r) => ({ ...r, title: getDoc(r.doc_id)?.title ?? '' }))
    .sort((a, b) => a.iso.localeCompare(b.iso));
}
export const getDocReminders = (docId: string): Reminder[] => reminders.filter((r) => r.doc_id === docId);
export function saveReminder(docId: string, isoDate: string, label: string, notifIds: string[], repeat: Repeat = 'none') {
  dropReminder(docId, isoDate, label);
  reminders.push({ doc_id: docId, iso: isoDate, label, notif_ids: JSON.stringify(notifIds), repeat });
}
export function dropReminder(docId: string, isoDate: string, label: string) {
  const i = reminders.findIndex((r) => r.doc_id === docId && r.iso === isoDate && r.label === label);
  if (i >= 0) reminders.splice(i, 1);
}

export function listTextsByKinds(kinds: string[], from: number, to: number) {
  return docs
    .filter((d) => kinds.includes(d.kind) && d.created >= from && d.created < to)
    .map((d) => ({ id: d.id, title: d.title, kind: d.kind, created: d.created, text: getPages(d.id).map((p) => p.text).join('\n') }));
}

export function deleteDoc(id: string) {
  for (let i = docs.length - 1; i >= 0; i--) if (docs[i].id === id) docs.splice(i, 1);
  for (let i = pages.length - 1; i >= 0; i--) if (pages[i].doc_id === id) pages.splice(i, 1);
  for (let i = reminders.length - 1; i >= 0; i--) if (reminders[i].doc_id === id) reminders.splice(i, 1);
}
