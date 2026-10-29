/* HTTP surface for machine import. A crawl takes minutes, so the admin starts it and polls:
 * one in-memory job at a time (a restart simply forgets it, like a half-finished crawl would be).
 * Same factory shape as coach/routes.js. */
import * as cfgStore from '../coach/config.js';
import * as store from './store.js';
import { normalize } from './normalize.js';
import { scrapeSite } from './scrape.js';

export function machineRoutes({ json, readBody, readSession, requireAdmin }) {
  let job = { status: 'idle' };

  async function run(url) {
    try {
      const { brand, slug, machines } = normalize(await scrapeSite(url), url);
      if (!machines.length) throw new Error('no machines found on that site');
      store.replaceBrand(slug, brand, url, machines);
      job = { status: 'done', url, count: machines.length, startedAt: job.startedAt };
    } catch (e) {
      console.error('machines import failed', e);
      job = { status: 'error', url, error: String(e.message || e).slice(0, 300), startedAt: job.startedAt };
    }
  }

  return {
    'GET /api/machines': async (req, res) => {
      if (!readSession(req)) return json(res, 401, { error: 'not signed in' });
      json(res, 200, { machines: store.list() });
    },

    'POST /api/admin/machines/import': async (req, res) => {
      if (!requireAdmin(req, res)) return;
      const { url } = await readBody(req);
      let u;
      try { u = new URL(String(url || '').trim()); } catch { /* handled below */ }
      if (!u || !/^https?:$/.test(u.protocol)) return json(res, 400, { error: 'enter a valid http(s) URL' });
      if (!cfgStore.isEnabled() || !cfgStore.isConnected() || cfgStore.load().provider !== 'claude') {
        return json(res, 503, { error: 'connect Claude in Admin → Coach first' });
      }
      if (job.status === 'running') return json(res, 409, { error: 'an import is already running' });
      job = { status: 'running', url: u.href, startedAt: Date.now() };
      run(u.href);
      json(res, 200, { ok: true });
    },

    'GET /api/admin/machines/status': async (req, res) => {
      if (!requireAdmin(req, res)) return;
      json(res, 200, { job, brands: store.brands() });
    },

    'POST /api/admin/machines/delete': async (req, res) => {
      if (!requireAdmin(req, res)) return;
      const { brand } = await readBody(req);
      if (!store.deleteBrand(String(brand || ''))) return json(res, 404, { error: 'no such brand' });
      json(res, 200, { ok: true });
    }
  };
}
