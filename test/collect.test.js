import test from 'node:test';
import assert from 'node:assert/strict';
import { collect } from '../src/collect.js';
import { parseTravelpayouts } from '../src/sources/travelpayouts.js';

const NOW = '2026-11-11T12:00:00Z';
const fake = (offers, err) => ({ search: async () => { if (err) throw err; return offers; } });
const base = { db: {}, state: {}, status: {}, deals: [], ctx: {}, now: NOW };
const S = { id: 's1', origin: 'GRU', destination: 'GIG', depart: '2026-12-20', sources: ['a'], intervalMinutes: 60 };

test('grava só as 10 mais baratas e marca lastRun', async () => {
  const offers = Array.from({ length: 15 }, (_, i) => ({ source: 'a', price: 1000 - i * 10 }));
  const r = await collect({ ...base, searches: [S], sources: { a: fake(offers) } });
  assert.equal(r.db.s1.length, 10);
  assert.equal(Math.min(...r.db.s1.map((x) => x.price)), 860);
  assert.equal(r.state.s1, NOW);
  assert.equal(r.status.a.ok, true);
});
test('fonte bloqueada vira status blocked e não derruba as outras', async () => {
  const blocked = Object.assign(new Error('x'), { code: 'blocked' });
  const r = await collect({ ...base, searches: [{ ...S, sources: ['b', 'a'] }], sources: { a: fake([{ source: 'a', price: 500 }]), b: fake([], blocked) } });
  assert.equal(r.status.b.ok, false);
  assert.equal(r.status.b.code, 'blocked');
  assert.equal(r.db.s1.length, 1);
});
test('busca não vencida é pulada', async () => {
  const r = await collect({ ...base, state: { s1: '2026-11-11T11:50:00Z' }, searches: [S], sources: { a: fake([{ source: 'a', price: 1 }]) } });
  assert.equal(r.db.s1, undefined);
});
test('viagem no passado é pulada', async () => {
  const r = await collect({ ...base, searches: [{ ...S, depart: '2026-01-01' }], sources: { a: fake([{ source: 'a', price: 1 }]) } });
  assert.equal(r.db.s1, undefined);
});
test('abaixo do alvo gera deal', async () => {
  const r = await collect({ ...base, searches: [{ ...S, targetPrice: 600 }], sources: { a: fake([{ source: 'a', price: 550, airline: 'LATAM' }]) } });
  assert.equal(r.deals.length, 1);
  assert.equal(r.deals[0].belowTarget, true);
});
test('queda brusca vs mediana gera relâmpago', async () => {
  const h = [1000, 1000, 1000].map((p, i) => ({ t: `2026-11-0${i + 1}T00:00:00Z`, price: p }));
  const r = await collect({ ...base, db: { s1: h }, searches: [S], sources: { a: fake([{ source: 'a', price: 700 }]) } });
  assert.equal(r.deals[0].flash, true);
  assert.equal(r.deals[0].dropPct, 30);
});
test('force ignora intervalo', async () => {
  const r = await collect({ ...base, force: true, state: { s1: '2026-11-11T11:59:00Z' }, searches: [S], sources: { a: fake([{ source: 'a', price: 9 }]) } });
  assert.equal(r.db.s1.length, 1);
});
test('travelpayouts: parse da resposta v3', () => {
  const json = { data: [{ price: 640, airline: 'G3', transfers: 0, departure_at: '2026-12-20T08:00:00-03:00', return_at: '2026-12-27T10:00:00-03:00', link: '/search/X?t=1' }, { price: 0 }] };
  const o = parseTravelpayouts(json, { depart: '2026-12-20' });
  assert.equal(o.length, 1);
  assert.equal(o[0].price, 640);
  assert.equal(o[0].return, '2026-12-27');
  assert.match(o[0].url, /^https:\/\/www\.aviasales\.com\.br\/search/);
});
test('travelpayouts: resposta inválida => []', () => {
  assert.deepEqual(parseTravelpayouts(null, {}), []);
});
