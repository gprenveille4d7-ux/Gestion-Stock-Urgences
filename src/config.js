export const APP_RELEASE = Object.freeze({
  version: '0.5.0-p0',
  date: '16/07/2026',
  name: 'Relève SMUR / Urgences'
});

export const DATABASE = Object.freeze({
  name: 'releve-smur-operational',
  version: 2,
  legacyLocalStorageKey: 'releve-smur-operational-v1'
});

export const REFERENCE_STATUS = Object.freeze({
  id: 'ref-smur-falaise-2026-07-p0',
  version: '2026.07-p0',
  status: 'demo-draft-needs-hospital-validation',
  label: 'Référentiel de démonstration — validation hospitalière requise',
  activatedAt: null
});

export const DEFAULT_USER = Object.freeze({
  id: 'local-demo-user',
  displayName: 'Utilisateur local',
  role: 'soignant',
  authentication: 'local-demo'
});

export const EXPIRY_HORIZONS = Object.freeze([30, 60, 90, 180]);

export const RESULT_TYPES = Object.freeze([
  'conforme',
  'manquant',
  'quantite_incorrecte',
  'perime',
  'defectueux',
  'non_applicable'
]);

export const ACTION_TYPES = Object.freeze({
  RESTOCK: 'rearmement',
  CONTROL: 'controle',
  REPLACE_EXPIRY: 'remplacement_peremption',
  REPAIR: 'traitement_defaut',
  RETURN: 'remise_en_place'
});
