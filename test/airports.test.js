import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { searchAirports, norm, cityLabel } from '../docs/airports.js';

const list = JSON.parse(fs.readFileSync(new URL('../docs/data/airports.json', import.meta.url), 'utf8'));
const top = (q) => searchAirports(list, q).map((a) => a[0]);

test('norm remove acento e caixa', () => assert.equal(norm('  São PAULO '), 'sao paulo'));
test('"miami" acha MIA primeiro', () => assert.equal(top('miami')[0], 'MIA'));
test('"MIAMI" e " miami " dão o mesmo resultado', () => assert.deepEqual(top('MIAMI'), top(' miami ')));
test('"nova york" acha JFK e EWR', () => { const r = top('nova york'); assert.ok(r.includes('JFK')); assert.ok(r.includes('EWR') || r.includes('LGA')); });
test('"sao paulo" (sem acento) acha GRU', () => assert.ok(top('sao paulo').includes('GRU')));
test('"lisboa" acha LIS', () => assert.equal(top('lisboa')[0], 'LIS'));
test('código exato vem primeiro: "gig"', () => assert.equal(top('gig')[0], 'GIG'));
test('"salvador" acha SSA', () => assert.ok(top('salvador').includes('SSA')));
test('"florianopolis" acha FLN', () => assert.equal(top('florianopolis')[0], 'FLN'));
test('busca por país: "portugal" retorna aeroportos de Portugal', () => assert.ok(top('portugal').length > 0));
test('vazio e sem resultado => []', () => { assert.deepEqual(top(''), []); assert.deepEqual(top('zzzzqqq'), []); });
test('respeita o limite', () => assert.ok(searchAirports(list, 'a', 5).length <= 5));
test('cityLabel', () => { assert.equal(cityLabel(list, 'MIA'), 'Miami (MIA)'); assert.equal(cityLabel(list, 'XXX'), 'XXX'); });
