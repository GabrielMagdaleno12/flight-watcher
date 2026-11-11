// Gera docs/data/airports.json a partir do OurAirports (domínio público).
// Uso: node tools/build-airports.mjs
import fs from 'node:fs';

const URL = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
const csv = await (await fetch(URL)).text();

function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur.replace(/\r$/, '')); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  return rows;
}

const [head, ...rows] = parseCsv(csv);
const ix = Object.fromEntries(head.map((h, i) => [h, i]));
const regions = new Intl.DisplayNames(['pt-BR'], { type: 'region' });

// nomes de cidades em português que diferem do inglês
const PT = { 'New York': 'Nova York', London: 'Londres', Lisbon: 'Lisboa', Rome: 'Roma', Paris: 'Paris', Madrid: 'Madri', Munich: 'Munique', Vienna: 'Viena', Prague: 'Praga', Warsaw: 'Varsóvia', Copenhagen: 'Copenhague', Brussels: 'Bruxelas', Geneva: 'Genebra', Zurich: 'Zurique', Athens: 'Atenas', Moscow: 'Moscou', Cairo: 'Cairo', Tokyo: 'Tóquio', Beijing: 'Pequim', Seoul: 'Seul', 'Mexico City': 'Cidade do México', Havana: 'Havana', Panama: 'Panamá', 'Panama City': 'Cidade do Panamá', 'Buenos Aires': 'Buenos Aires', Santiago: 'Santiago', Lima: 'Lima', Bogota: 'Bogotá', Montevideo: 'Montevidéu', Asuncion: 'Assunção', Florence: 'Florença', Venice: 'Veneza', Milan: 'Milão', Naples: 'Nápoles', Cologne: 'Colônia', Edinburgh: 'Edimburgo', Seville: 'Sevilha', Dubai: 'Dubai', 'Abu Dhabi': 'Abu Dhabi', 'Sao Paulo': 'São Paulo', 'Rio De Janeiro': 'Rio de Janeiro', Brasilia: 'Brasília', Belem: 'Belém', Maceio: 'Maceió', Goiania: 'Goiânia', 'Foz Do Iguacu': 'Foz do Iguaçu', 'Sao Luis': 'São Luís', Cuiaba: 'Cuiabá', Florianopolis: 'Florianópolis', Joao: 'João' };

const out = [];
for (const r of rows) {
  const iata = r[ix.iata_code];
  if (!iata || r[ix.scheduled_service] !== 'yes') continue;
  if (!['large_airport', 'medium_airport'].includes(r[ix.type])) continue;
  const city = r[ix.municipality] || r[ix.name];
  out.push([iata, PT[city] ?? city, r[ix.name], regions.of(r[ix.iso_country]) ?? r[ix.iso_country], r[ix.type] === 'large_airport' ? 1 : 0]);
}
out.sort((a, b) => b[4] - a[4] || a[1].localeCompare(b[1]));
fs.writeFileSync('docs/data/airports.json', JSON.stringify(out));
console.log(out.length, 'aeroportos;', (fs.statSync('docs/data/airports.json').size / 1024).toFixed(0), 'KB');
for (const k of ['MIA', 'GRU', 'JFK', 'LIS', 'SSA', 'FLN']) console.log(JSON.stringify(out.find((x) => x[0] === k)));
