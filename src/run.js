import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collect } from './collect.js';
import { launch } from './browser.js';
import * as google from './sources/google.js';
import * as travelpayouts from './sources/travelpayouts.js';

const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'data');
const read = (f, fallback) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch { return fallback; } };
const write = (f, v) => fs.writeFileSync(path.join(DATA, f), JSON.stringify(v, null, 1) + '\n');

const searches = read('searches.json', []);
const now = new Date().toISOString();

// navegador só sobe se alguma fonte pedir uma página
let session = null;
const ctx = {
  env: process.env,
  newPage: async () => { session ??= await launch(); return session.context.newPage(); },
};

const result = await collect({
  searches,
  db: read('prices.json', {}),
  state: read('state.json', {}),
  status: read('status.json', {}),
  deals: read('deals.json', []),
  sources: { [google.id]: google, [travelpayouts.id]: travelpayouts },
  ctx, now, force: process.env.FORCE === '1',
});
if (session) await session.browser.close();

write('prices.json', result.db);
write('state.json', result.state);
write('status.json', result.status);
write('deals.json', result.deals);
write('meta.json', { updatedAt: now, sources: [{ id: google.id, name: google.name }, { id: travelpayouts.id, name: travelpayouts.name }] });
console.log('ok', now, JSON.stringify(result.status));
