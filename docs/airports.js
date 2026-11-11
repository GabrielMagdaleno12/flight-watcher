// Busca de aeroportos por cidade/nome/código, sem acentos. Registro: [iata, cidade, nome, país, grande(1|0)]
export const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function searchAirports(list, query, limit = 8) {
  const terms = norm(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const scored = [];
  for (const a of list) {
    const [iata, city, name, country, big] = a;
    const c = norm(city), n = norm(name), k = norm(country), i = iata.toLowerCase();
    const hay = `${c} ${n} ${k} ${i}`;
    if (!terms.every((t) => hay.includes(t))) continue;
    const q = terms.join(' ');
    let s = 0;
    if (i === q) s = 100;
    else if (c === q) s = 95;
    else if (c.startsWith(q)) s = 90;
    else if (c.split(/[\s-]+/).some((w) => w.startsWith(terms[0]))) s = 70;
    else if (c.includes(q)) s = 60;
    else if (n.includes(q)) s = 50;
    else s = 30;
    scored.push([s + (big ? 5 : 0), a]);
  }
  return scored.sort((x, y) => y[0] - x[0]).slice(0, limit).map((x) => x[1]);
}

export const findByIata = (list, code) => list.find((a) => a[0] === String(code).toUpperCase());
export const cityLabel = (list, code) => { const a = findByIata(list, code); return a ? `${a[1]} (${a[0]})` : code; };
