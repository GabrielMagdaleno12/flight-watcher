import { isDue } from './due.js';
import { classify } from './deals.js';
import { appendOffers } from './history.js';

const KEEP_PER_RUN = 10;
const MAX_DEALS = 60;

// Núcleo injetável: não toca em disco; só chama as fontes recebidas.
export async function collect({ searches, db, state, status, deals, sources, ctx, now, force = false }) {
  const today = now.slice(0, 10);
  const newState = { ...state };
  const newStatus = { ...status };
  let newDb = db;
  const newDeals = [...deals];

  for (const s of searches) {
    if (s.active === false) continue;
    if (s.depart < today) continue; // viagem já passou
    if (!force && !isDue(s, state[s.id], now)) continue;

    const found = [];
    for (const srcId of s.sources ?? ['google']) {
      const src = sources[srcId];
      if (!src) continue;
      try {
        const offers = await src.search(ctx, s);
        newStatus[srcId] = { ok: true, at: now, offers: offers.length, lastOkAt: now };
        found.push(...offers);
      } catch (e) {
        newStatus[srcId] = { ...(newStatus[srcId] ?? {}), ok: false, at: now, code: e.code ?? 'error', error: String(e.message).slice(0, 200) };
      }
    }

    const best = found.sort((a, b) => a.price - b.price).slice(0, KEEP_PER_RUN);
    const history = db[s.id] ?? [];
    const cheapest = best[0];
    if (cheapest) {
      const c = classify(cheapest, history, s);
      if (c.belowTarget || c.flash) {
        newDeals.unshift({
          t: now, searchId: s.id, label: s.label ?? `${s.origin}→${s.destination}`,
          price: cheapest.price, airline: cheapest.airline, source: cheapest.source, url: cheapest.url,
          belowTarget: c.belowTarget, flash: c.flash, dropPct: c.dropPct == null ? null : Math.round(c.dropPct),
        });
      }
    }
    newDb = appendOffers(newDb, s.id, best, now);
    newState[s.id] = now;
  }
  return { db: newDb, state: newState, status: newStatus, deals: newDeals.slice(0, MAX_DEALS) };
}
