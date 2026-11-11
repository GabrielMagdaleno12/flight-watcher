const MIN_INTERVAL = 15;
const DEFAULT_INTERVAL = 60;

export function isDue(search, lastRunISO, nowISO) {
  if (!lastRunISO) return true;
  const interval = Math.max(MIN_INTERVAL, Number(search.intervalMinutes) || DEFAULT_INTERVAL);
  const elapsedMin = (Date.parse(nowISO) - Date.parse(lastRunISO)) / 60000;
  // tolerância de 1 min: o cron do Actions costuma atrasar/adiantar
  return elapsedMin >= interval - 1;
}
