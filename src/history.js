const KEEP_DAYS = 90;

export function appendOffers(db, searchId, offers, nowISO) {
  const cutoff = Date.parse(nowISO) - KEEP_DAYS * 86400000;
  const kept = (db[searchId] ?? []).filter((r) => Date.parse(r.t) >= cutoff);
  for (const o of offers) {
    if (typeof o.price !== 'number' || !Number.isFinite(o.price) || o.price <= 0) continue;
    kept.push({ t: nowISO, source: o.source, price: o.price, airline: o.airline ?? null, stops: o.stops ?? null, depart: o.depart ?? null, return: o.return ?? null, url: o.url ?? null });
  }
  return { ...db, [searchId]: kept };
}
