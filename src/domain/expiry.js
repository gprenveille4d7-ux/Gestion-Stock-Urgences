import { DEFAULT_EXPIRY_THRESHOLDS } from '../config.js';

export const EXPIRY_PANELS = Object.freeze({
  TO_TREAT: 'to-treat',
  WITHIN_30: 'within-30',
  WITHIN_90: 'within-90',
  TREATED_THIS_MONTH: 'treated-this-month'
});

function validDate(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function utcDayNumber(value) {
  const date = validDate(value);
  if (!date) return null;
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
}

export function daysUntil(dateValue, now = new Date()) {
  const expiryDay = utcDayNumber(dateValue);
  const currentDay = utcDayNumber(now);
  if (expiryDay === null || currentDay === null) return Number.POSITIVE_INFINITY;
  return expiryDay - currentDay;
}

export function expiryDateFromMonth(expiryMonth) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(expiryMonth || ''));
  if (!match) throw new Error('Mois et année de péremption requis');
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 2000 || year > 9999 || month < 1 || month > 12) throw new Error('Mois et année de péremption invalides');
  // Midi UTC conserve le dernier jour calendaire du mois dans le fuseau cible
  // Europe/Paris, y compris lors des changements d'heure.
  return new Date(Date.UTC(year, month, 0, 12, 0, 0, 0)).toISOString();
}

export function normalizeExpiryThresholds(value = {}) {
  const thresholds = {
    urgentDays: Number(value.urgentDays ?? DEFAULT_EXPIRY_THRESHOLDS.urgentDays),
    rapidReplacementDays: Number(value.rapidReplacementDays ?? DEFAULT_EXPIRY_THRESHOLDS.rapidReplacementDays),
    anticipationDays: Number(value.anticipationDays ?? DEFAULT_EXPIRY_THRESHOLDS.anticipationDays),
    monitoringDays: Number(value.monitoringDays ?? DEFAULT_EXPIRY_THRESHOLDS.monitoringDays)
  };
  const ordered = [thresholds.urgentDays, thresholds.rapidReplacementDays, thresholds.anticipationDays, thresholds.monitoringDays];
  if (!ordered.every(Number.isFinite) || ordered.some((days) => days < 0) || ordered.some((days, index) => index > 0 && days < ordered[index - 1])) {
    throw new Error('Seuils de péremption invalides');
  }
  return Object.freeze(thresholds);
}

export function expiryStatus(dateValue, now = new Date(), thresholdOverrides = {}) {
  const days = daysUntil(dateValue, now);
  if (!Number.isFinite(days)) return 'inconnue';
  const thresholds = normalizeExpiryThresholds(thresholdOverrides);
  if (days < 0) return 'perime';
  if (days <= thresholds.rapidReplacementDays) return 'critique';
  if (days <= thresholds.anticipationDays) return 'a_anticiper';
  if (days <= thresholds.monitoringDays) return 'surveillance';
  return 'ok';
}

export function isActiveLot(lot) {
  return (lot?.status || lot?.state) === 'active';
}

export function expiryPanelForLot(lot, now = new Date(), thresholdOverrides = {}) {
  if (!isActiveLot(lot)) return null;
  const days = daysUntil(lot.expiryDate, now);
  if (!Number.isFinite(days)) return EXPIRY_PANELS.TO_TREAT;
  const thresholds = normalizeExpiryThresholds(thresholdOverrides);
  if (days <= thresholds.urgentDays) return EXPIRY_PANELS.TO_TREAT;
  if (days <= thresholds.rapidReplacementDays) return EXPIRY_PANELS.WITHIN_30;
  if (days <= thresholds.anticipationDays) return EXPIRY_PANELS.WITHIN_90;
  return days <= thresholds.monitoringDays ? 'monitoring' : 'compliant';
}

export function enrichLotExpiry(lot, now = new Date(), thresholdOverrides = {}) {
  return {
    ...lot,
    daysRemaining: daysUntil(lot.expiryDate, now),
    expiryStatus: expiryStatus(lot.expiryDate, now, thresholdOverrides),
    expiryPanel: expiryPanelForLot(lot, now, thresholdOverrides)
  };
}

function isSameCalendarMonth(value, now) {
  const date = validDate(value);
  const current = validDate(now);
  return Boolean(date && current && date.getFullYear() === current.getFullYear() && date.getMonth() === current.getMonth());
}

export function computeExpiryDashboard(lots, now = new Date(), thresholdOverrides = {}) {
  const thresholds = normalizeExpiryThresholds(thresholdOverrides);
  const active = (lots || [])
    .filter(isActiveLot)
    .map((lot) => enrichLotExpiry(lot, now, thresholds))
    .sort((left, right) => left.daysRemaining - right.daysRemaining);
  const treated = (lots || [])
    .filter((lot) => (lot.status || lot.state) === 'replaced' || ((lot.status || lot.state) === 'archived' && Boolean(lot.replacementLotId)))
    .filter((lot) => isSameCalendarMonth(lot.replacedAt || lot.archivedAt || lot.updatedAt, now));
  const groups = {
    [EXPIRY_PANELS.TO_TREAT]: active.filter((lot) => lot.expiryPanel === EXPIRY_PANELS.TO_TREAT),
    [EXPIRY_PANELS.WITHIN_30]: active.filter((lot) => lot.expiryPanel === EXPIRY_PANELS.WITHIN_30),
    [EXPIRY_PANELS.WITHIN_90]: active.filter((lot) => lot.expiryPanel === EXPIRY_PANELS.WITHIN_90),
    [EXPIRY_PANELS.TREATED_THIS_MONTH]: treated
  };
  return {
    thresholds,
    groups,
    counts: Object.fromEntries(Object.entries(groups).map(([panel, values]) => [panel, values.length])),
    activeLots: active,
    treatedLots: treated
  };
}

export function filterLotsByPanel(lots, panel, now = new Date(), thresholdOverrides = {}) {
  const dashboard = computeExpiryDashboard(lots, now, thresholdOverrides);
  return panel ? [...(dashboard.groups[panel] || [])] : dashboard.activeLots;
}

export function filterLotsByHorizon(lots, horizonDays, now = new Date()) {
  return (lots || [])
    .filter(isActiveLot)
    .map((lot) => enrichLotExpiry(lot, now))
    .filter((lot) => lot.daysRemaining <= horizonDays)
    .sort((left, right) => left.daysRemaining - right.daysRemaining);
}
