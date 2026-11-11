// Travelpayouts / Aviasales: API oficial e gratuita (cadastro em travelpayouts.com). Preços em cache de várias agências.
export const id = 'travelpayouts';
export const name = 'Travelpayouts (Aviasales)';

export function parseTravelpayouts(json, q) {
  if (!json || !Array.isArray(json.data)) return [];
  return json.data
    .filter((d) => Number(d.price) > 0)
    .map((d) => ({
      source: id,
      price: Number(d.price),
      currency: 'BRL',
      airline: d.airline ?? null,
      stops: d.transfers ?? null,
      depart: (d.departure_at ?? q.depart).slice(0, 10),
      return: d.return_at ? d.return_at.slice(0, 10) : (q.return ?? null),
      url: d.link ? `https://www.aviasales.com.br${d.link}` : 'https://www.aviasales.com.br',
    }));
}

export async function search({ env }, q) {
  const token = env.TRAVELPAYOUTS_TOKEN;
  if (!token) throw Object.assign(new Error('TRAVELPAYOUTS_TOKEN não configurado'), { code: 'not_configured' });
  const p = new URLSearchParams({ origin: q.origin, destination: q.destination, departure_at: q.depart, currency: 'brl', sorting: 'price', limit: '10', token });
  if (q.return) p.set('return_at', q.return);
  const res = await fetch(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?${p}`, { signal: AbortSignal.timeout(20000) });
  if (res.status === 401 || res.status === 403) throw Object.assign(new Error(`token inválido (HTTP ${res.status})`), { code: 'not_configured' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseTravelpayouts(await res.json(), q);
}
