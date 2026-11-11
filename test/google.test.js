import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseGoogleText, buildGoogleUrl } from '../src/sources/google.js';

const text = fs.readFileSync(new URL('./fixtures/google-gru-gig.txt', import.meta.url), 'utf8');
const q = { origin: 'GRU', destination: 'GIG', depart: '2026-12-20', return: '2026-12-27' };

test('parseGoogleText: extrai voos reais da captura', () => {
  const offers = parseGoogleText(text, q);
  assert.ok(offers.length >= 4, 'esperava ao menos 4 ofertas, veio ' + offers.length);
  assert.equal(offers[0].price, 574);
  assert.equal(offers[0].airline, 'LATAM');
  assert.equal(offers[0].stops, 0);
  assert.equal(offers[0].source, 'google');
  assert.equal(offers[0].depart, '2026-12-20');
  assert.equal(offers[0].return, '2026-12-27');
});
test('parseGoogleText: preço com milhar (R$ 1.155) e companhia Gol', () => {
  const gol = parseGoogleText(text, q).find((o) => o.airline === 'Gol');
  assert.equal(gol.price, 1155);
});
test('parseGoogleText: ignora "a partir de R$ 574" e textos soltos', () => {
  const offers = parseGoogleText(text, q);
  assert.ok(offers.every((o) => o.price === 574 || o.price >= 500));
  assert.equal(offers.length, offers.filter((o) => o.airline).length);
});
test('parseGoogleText: texto vazio => []', () => {
  assert.deepEqual(parseGoogleText('', q), []);
});
test('buildGoogleUrl: inclui rota, datas, BRL e pt-BR', () => {
  const u = buildGoogleUrl(q);
  assert.match(u, /GIG/); assert.match(u, /GRU/);
  assert.match(u, /2026-12-20/); assert.match(u, /2026-12-27/);
  assert.match(u, /curr=BRL/); assert.match(u, /hl=pt-BR/);
});
test('buildGoogleUrl: só ida omite "through"', () => {
  assert.doesNotMatch(buildGoogleUrl({ ...q, return: null }), /through/);
});
