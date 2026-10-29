/* Turning a crawl result into stored machines. The agent's JSON is untrusted model output, so
 * every field is checked against the same vocabularies the app already understands: body parts
 * from coach/library.json, muscle names from the frontend's muscle map. Pure, so it is tested
 * without any network or model. */

export const BODY_PARTS = ["back","cardio","chest","lower arms","lower legs","neck","shoulders","upper arms","upper legs","waist"];
// Keys of ALIAS in frontend/src/lib/muscles.js (minus the ones that map to null = not drawable).
// Keep in sync by hand: the api cannot import across packages.
export const MUSCLES = [
  'abs', 'pectorals', 'biceps', 'glutes', 'delts', 'triceps', 'upper back', 'lats', 'calves',
  'quads', 'forearms', 'hamstrings', 'spine', 'traps', 'adductors', 'serratus anterior',
  'abductors', 'levator scapulae', 'shoulders', 'deltoids', 'rear deltoids', 'rotator cuff',
  'quadriceps', 'core', 'abdominals', 'lower abs', 'chest', 'upper chest', 'hip flexors',
  'obliques', 'lower back', 'rhomboids', 'trapezius', 'back', 'latissimus dorsi', 'brachialis',
  'soleus', 'shins', 'wrists', 'wrist flexors', 'wrist extensors', 'grip muscles', 'groin',
  'inner thighs'
];
export const MAX_MACHINES = 500;

const slugify = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const httpUrl = (v, protocols) => {
  try { const u = new URL(str(v, 500)); return protocols.includes(u.protocol) ? u.href : null; } catch { return null; }
};

/** gym80.de -> gym80, www.life-fitness.com -> life-fitness: the label before the TLD. */
export function brandSlug(siteUrl) {
  const parts = new URL(siteUrl).hostname.replace(/^www\./, '').split('.');
  return slugify(parts.length > 1 ? parts[parts.length - 2] : parts[0]);
}

/** raw = the agent's parsed JSON; returns { brand, slug, machines } (machines may be empty). */
export function normalize(raw, siteUrl) {
  const slug = brandSlug(siteUrl);
  const brand = str(raw?.brand, 60) || slug;
  const seen = new Map();
  for (const m of Array.isArray(raw?.machines) ? raw.machines : []) {
    const name = str(m?.name, 80), series = str(m?.series, 60);
    const bp = str(m?.bodyPart, 30).toLowerCase(), tg = str(m?.target, 30).toLowerCase();
    if (!name || !BODY_PARTS.includes(bp) || !MUSCLES.includes(tg)) continue;
    const id = `m_${slug}_${slugify(series ? `${name} ${series}` : name)}`;
    if (seen.has(id)) continue;
    const sm = [...new Set((Array.isArray(m.secondary) ? m.secondary : []).map(s => str(s, 30).toLowerCase()))]
      .filter(s => MUSCLES.includes(s) && s !== tg);
    const img = httpUrl(m.image, ['https:']), url = httpUrl(m.url, ['https:', 'http:']);
    seen.set(id, {
      id, n: series ? `${name} (${series})` : name, bp, eq: brand, tg, sm,
      ...(img && { img }), ...(url && { url }), machine: true
    });
    if (seen.size >= MAX_MACHINES) break;
  }
  return { brand, slug, machines: [...seen.values()] };
}
