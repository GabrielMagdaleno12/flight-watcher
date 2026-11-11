const FLASH_DROP_PCT = 20;
const MIN_SAMPLES = 3;

function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function classify(offer, history, search) {
  const belowTarget = search.targetPrice != null && offer.price <= search.targetPrice;
  const prices = history.map((h) => h.price).filter((p) => p > 0);
  if (prices.length < MIN_SAMPLES) return { belowTarget, flash: false, dropPct: null };
  const base = median(prices);
  const dropPct = ((base - offer.price) / base) * 100;
  return { belowTarget, flash: dropPct >= FLASH_DROP_PCT, dropPct };
}
