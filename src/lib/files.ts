import * as FS from 'expo-file-system/legacy';

// iOS changes the app container path between updates, so we store paths relative to the document directory.
const ROOT = FS.documentDirectory ?? '';

export const abs = (rel: string) => ROOT + rel;

export async function ensureDir(rel: string) {
  const info = await FS.getInfoAsync(abs(rel));
  if (!info.exists) await FS.makeDirectoryAsync(abs(rel), { intermediates: true });
}

export async function copyIn(from: string, rel: string) {
  await FS.copyAsync({ from, to: abs(rel) });
}

export async function remove(rel: string) {
  await FS.deleteAsync(abs(rel), { idempotent: true });
}

export async function writeText(rel: string, contents: string) {
  await FS.writeAsStringAsync(abs(rel), contents);
}

export async function readBase64(uri: string) {
  return FS.readAsStringAsync(uri, { encoding: FS.EncodingType.Base64 });
}

export async function move(from: string, rel: string) {
  await FS.deleteAsync(abs(rel), { idempotent: true });
  await FS.moveAsync({ from, to: abs(rel) });
}
