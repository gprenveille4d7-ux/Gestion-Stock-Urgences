export function daysUntil(dateValue, now = new Date()) {
  const expiry = new Date(dateValue);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  if (Number.isNaN(expiry.getTime())) return Number.POSITIVE_INFINITY;
  return Math.ceil((expiry.getTime() - start.getTime()) / 86400000);
}

export function expiryStatus(dateValue, now = new Date()) {
  const days = daysUntil(dateValue, now);
  if (!Number.isFinite(days)) return 'inconnue';
  if (days < 0) return 'perime';
  if (days <= 30) return 'critique';
  if (days <= 90) return 'a_anticiper';
  return 'ok';
}

export function filterLotsByHorizon(lots, horizonDays, now = new Date()) {
  return lots
    .map((lot) => ({ ...lot, daysRemaining: daysUntil(lot.expiryDate, now), expiryStatus: expiryStatus(lot.expiryDate, now) }))
    .filter((lot) => lot.status === 'active' && lot.daysRemaining <= horizonDays)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

