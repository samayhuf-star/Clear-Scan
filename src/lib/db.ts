import * as SQLite from 'expo-sqlite';

// Everything lives in one local SQLite file inside the app container. Nothing is sent anywhere.
const db = SQLite.openDatabaseSync('clearscan.db');

db.execSync(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS docs (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'Document',
    created INTEGER NOT NULL,
    pages INTEGER NOT NULL DEFAULT 1,
    favorite INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS pages (
    doc_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    image TEXT NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (doc_id, idx)
  );
  CREATE VIRTUAL TABLE IF NOT EXISTS fts USING fts5(doc_id UNINDEXED, title, body);
  CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY NOT NULL, v TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS reminders (
    doc_id TEXT NOT NULL,
    iso TEXT NOT NULL,
    label TEXT NOT NULL,
    notif_ids TEXT NOT NULL DEFAULT '[]',
    PRIMARY KEY (doc_id, iso, label)
  );
`);

try {
  db.execSync("ALTER TABLE reminders ADD COLUMN repeat TEXT NOT NULL DEFAULT 'none'");
} catch {
  // column already exists
}

export type Doc = {
  id: string;
  title: string;
  kind: string;
  created: number;
  pages: number;
  favorite: number;
};

export type PageRow = { doc_id: string; idx: number; image: string; text: string };

export function kvGet(k: string): string | null {
  return db.getFirstSync<{ v: string }>('SELECT v FROM kv WHERE k = ?', k)?.v ?? null;
}

export function kvSet(k: string, v: string) {
  db.runSync('INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)', k, v);
}

export function insertDoc(doc: Doc, pages: { image: string; text: string }[]) {
  db.withTransactionSync(() => {
    db.runSync(
      'INSERT INTO docs (id, title, kind, created, pages, favorite) VALUES (?, ?, ?, ?, ?, 0)',
      doc.id, doc.title, doc.kind, doc.created, pages.length
    );
    pages.forEach((p, i) => {
      db.runSync('INSERT INTO pages (doc_id, idx, image, text) VALUES (?, ?, ?, ?)', doc.id, i, p.image, p.text);
    });
    db.runSync(
      'INSERT INTO fts (doc_id, title, body) VALUES (?, ?, ?)',
      doc.id, doc.title, pages.map((p) => p.text).join('\n')
    );
  });
}

export function appendPages(docId: string, pgs: { image: string; text: string }[]) {
  db.withTransactionSync(() => {
    const row = db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM pages WHERE doc_id = ?', docId);
    const start = row?.n ?? 0;
    pgs.forEach((p, i) => {
      db.runSync('INSERT INTO pages (doc_id, idx, image, text) VALUES (?, ?, ?, ?)', docId, start + i, p.image, p.text);
    });
    db.runSync('UPDATE docs SET pages = ? WHERE id = ?', start + pgs.length, docId);
    const title = db.getFirstSync<{ title: string }>('SELECT title FROM docs WHERE id = ?', docId)?.title ?? '';
    const all = db.getAllSync<{ text: string }>('SELECT text FROM pages WHERE doc_id = ? ORDER BY idx', docId).map((r) => r.text).join('\n');
    db.runSync('DELETE FROM fts WHERE doc_id = ?', docId);
    db.runSync('INSERT INTO fts (doc_id, title, body) VALUES (?, ?, ?)', docId, title, all);
  });
}

function ftsQuery(q: string): string {
  const tokens = q
    .replace(/["']/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  return tokens.map((t) => `"${t}"*`).join(' ');
}

export function listDocs(opts: { query?: string; kind?: string; favorites?: boolean } = {}): Doc[] {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (opts.kind) { where.push('d.kind = ?'); args.push(opts.kind); }
  if (opts.favorites) where.push('d.favorite = 1');
  const q = opts.query?.trim();
  if (q) {
    where.push('d.id IN (SELECT doc_id FROM fts WHERE fts MATCH ?)');
    args.push(ftsQuery(q));
  }
  const sql = `SELECT d.* FROM docs d ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY d.created DESC`;
  try {
    return db.getAllSync<Doc>(sql, args);
  } catch {
    return [];
  }
}

export function getDoc(id: string): Doc | null {
  return db.getFirstSync<Doc>('SELECT * FROM docs WHERE id = ?', id);
}

export function getPages(id: string): PageRow[] {
  return db.getAllSync<PageRow>('SELECT * FROM pages WHERE doc_id = ? ORDER BY idx', id);
}

export function countDocs(): number {
  return db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM docs')?.n ?? 0;
}

export function setTitle(id: string, title: string) {
  db.withTransactionSync(() => {
    db.runSync('UPDATE docs SET title = ? WHERE id = ?', title, id);
    const body = getPages(id).map((p) => p.text).join('\n');
    db.runSync('DELETE FROM fts WHERE doc_id = ?', id);
    db.runSync('INSERT INTO fts (doc_id, title, body) VALUES (?, ?, ?)', id, title, body);
  });
}

export function setFavorite(id: string, fav: boolean) {
  db.runSync('UPDATE docs SET favorite = ? WHERE id = ?', fav ? 1 : 0, id);
}

export function setKind(id: string, kind: string) {
  db.runSync('UPDATE docs SET kind = ? WHERE id = ?', kind, id);
}

export type Repeat = 'none' | 'monthly' | 'yearly';
export type Reminder = { doc_id: string; iso: string; label: string; notif_ids: string; repeat: Repeat };

export function listReminders(): (Reminder & { title: string })[] {
  return db.getAllSync(
    'SELECT r.*, d.title AS title FROM reminders r JOIN docs d ON d.id = r.doc_id ORDER BY r.iso ASC'
  );
}

export function getDocReminders(docId: string): Reminder[] {
  return db.getAllSync<Reminder>('SELECT * FROM reminders WHERE doc_id = ?', docId);
}

export function saveReminder(docId: string, iso: string, label: string, notifIds: string[], repeat: Repeat = 'none') {
  db.runSync(
    'INSERT OR REPLACE INTO reminders (doc_id, iso, label, notif_ids, repeat) VALUES (?, ?, ?, ?, ?)',
    docId, iso, label, JSON.stringify(notifIds), repeat
  );
}

/** Recognised text of every scan of the given kinds created between two timestamps (ms). */
export function listTextsByKinds(kinds: string[], from: number, to: number): { id: string; title: string; kind: string; created: number; text: string }[] {
  const marks = kinds.map(() => '?').join(',');
  return db.getAllSync(
    `SELECT d.id AS id, d.title AS title, d.kind AS kind, d.created AS created, COALESCE(group_concat(p.text, char(10)), '') AS text
     FROM docs d LEFT JOIN pages p ON p.doc_id = d.id
     WHERE d.kind IN (${marks}) AND d.created >= ? AND d.created < ?
     GROUP BY d.id ORDER BY d.created DESC`,
    ...kinds, from, to
  );
}

export function dropReminder(docId: string, iso: string, label: string) {
  db.runSync('DELETE FROM reminders WHERE doc_id = ? AND iso = ? AND label = ?', docId, iso, label);
}

export function deleteDoc(id: string) {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM reminders WHERE doc_id = ?', id);
    db.runSync('DELETE FROM pages WHERE doc_id = ?', id);
    db.runSync('DELETE FROM fts WHERE doc_id = ?', id);
    db.runSync('DELETE FROM docs WHERE id = ?', id);
  });
}
