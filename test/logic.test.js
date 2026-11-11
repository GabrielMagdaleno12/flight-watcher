import test from 'node:test';
import assert from 'node:assert/strict';
import { isDue } from '../src/due.js';
import { classify } from '../src/deals.js';
import { appendOffers } from '../src/history.js';

const NOW = '2026-11-11T12:00:00Z';

test('isDue: nunca rodou => vence', () => {
  assert.equal(isDue({ intervalMinutes: 60 }, null, NOW), true);
});
test('isDue: dentro do intervalo => não vence', () => {
  assert.equal(isDue({ intervalMinutes: 60 }, '2026-11-11T11:30:00Z', NOW), false);
});
test('isDue: passou do intervalo => vence', () => {
  assert.equal(isDue({ intervalMinutes: 60 }, '2026-11-11T10:59:00Z', NOW), true);
});
test('isDue: intervalo menor que 15 vira 15', () => {
  assert.equal(isDue({ intervalMinutes: 1 }, '2026-11-11T11:50:00Z', NOW), false);
  assert.equal(isDue({ intervalMinutes: 1 }, '2026-11-11T11:44:00Z', NOW), true);
});
test('isDue: intervalo ausente usa 60', () => {
  assert.equal(isDue({}, '2026-11-11T11:30:00Z', NOW), false);
});

const hist = (prices) => prices.map((p, i) => ({ t: `2026-11-0${i + 1}T00:00:00Z`, price: p }));

test('classify: abaixo do preço-alvo', () => {
  const r = classify({ price: 900 }, hist([1000, 1000]), { targetPrice: 950 });
  assert.equal(r.belowTarget, true);
});
test('classify: sem alvo => belowTarget false', () => {
  assert.equal(classify({ price: 900 }, hist([1000]), {}).belowTarget, false);
});
test('classify: relâmpago quando 20%+ abaixo da mediana', () => {
  const r = classify({ price: 700 }, hist([1000, 1000, 1000, 1000]), {});
  assert.equal(r.flash, true);
  assert.equal(Math.round(r.dropPct), 30);
});
test('classify: sem histórico suficiente (<3) => sem relâmpago', () => {
  const r = classify({ price: 100 }, hist([1000, 1000]), {});
  assert.equal(r.flash, false);
  assert.equal(r.dropPct, null);
});
test('classify: queda pequena não é relâmpago', () => {
  assert.equal(classify({ price: 900 }, hist([1000, 1000, 1000]), {}).flash, false);
});

test('appendOffers: descarta preço inválido', () => {
  const db = appendOffers({}, 's1', [{ source: 'g', price: 0 }, { source: 'g', price: NaN }, { source: 'g', price: 'x' }], NOW);
  assert.deepEqual(db.s1 ?? [], []);
});
test('appendOffers: guarda e poda >90 dias', () => {
  let db = { s1: [{ t: '2026-01-01T00:00:00Z', source: 'g', price: 5 }] };
  db = appendOffers(db, 's1', [{ source: 'g', price: 800, airline: 'LATAM' }], NOW);
  assert.equal(db.s1.length, 1);
  assert.equal(db.s1[0].price, 800);
  assert.equal(db.s1[0].t, NOW);
});
