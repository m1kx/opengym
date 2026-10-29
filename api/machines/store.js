/* Instance-wide machine catalogue, one file the server alone writes: DATA_DIR/machines.json as
 * { brands: { [slug]: { name, url, importedAt, machines } } }. Written via tmp + rename like the
 * Coach's per-user files, so a crash mid-write never leaves half a catalogue. */
import fs from 'node:fs';
import path from 'node:path';

const DATA = process.env.DATA_DIR || '/data';
const FILE = path.join(DATA, 'machines.json');

function read() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')).brands || {}; } catch { return {}; }
}
function write(brands) {
  fs.mkdirSync(DATA, { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ brands }), { mode: 0o600 });
  fs.renameSync(tmp, FILE);
}

/** Every machine across brands, flat. */
export const list = () => Object.values(read()).flatMap(b => b.machines);

/** Brand summaries for the admin card. */
export const brands = () => Object.entries(read()).map(([slug, b]) => ({
  slug, name: b.name, url: b.url, importedAt: b.importedAt, count: b.machines.length
}));

/** A re-import replaces the brand wholesale. */
export function replaceBrand(slug, name, url, machines) {
  write({ ...read(), [slug]: { name, url, importedAt: new Date().toISOString(), machines } });
}

export function deleteBrand(slug) {
  const b = read();
  if (!(slug in b)) return false;
  delete b[slug];
  write(b);
  return true;
}
