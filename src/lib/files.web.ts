// Web preview build: scans are data URIs, so paths are used as they are.
export const abs = (rel: string) => rel;
export async function ensureDir(_rel: string) {}
export async function copyIn(_from: string, rel: string) { return rel; }
export async function remove(_rel: string) {}
export async function writeText(_rel: string, _contents: string) {}
export async function readBase64(_uri: string) { return ''; }
export async function move(_from: string, rel: string) { return rel; }
