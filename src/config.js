export const APP_RELEASE = Object.freeze({
  version: '1.0.0',
  date: '17/07/2026',
  name: 'Relève SMUR / Urgences'
});

export const DATABASE = Object.freeze({
  name: 'releve-smur-operational',
  version: 3,
  legacyLocalStorageKey: 'releve-smur-operational-v1'
});

export const REFERENCE_STATUS = Object.freeze({
  id: 'ref-smur-falaise-2026-07-source-v1',
  version: '2026.07-source-v1',
  status: 'imported-from-source',
  label: 'Référentiel importé depuis les documents sources',
  physicalLayoutStatus: 'physical-layout-provisional',
  activatedAt: '2026-07-17'
});

export const DEFAULT_USER = Object.freeze({
  id: 'local-user',
  displayName: 'Utilisateur local',
  role: 'soignant',
  authentication: 'local-device'
});

export const EXPIRY_HORIZONS = Object.freeze([30, 60, 90, 180]);

// Paramètres logistiques initiaux. Ils restent modifiables par configuration et
// ne constituent pas une règle médicale ou pharmaceutique officielle.
export const DEFAULT_EXPIRY_THRESHOLDS = Object.freeze({
  urgentDays: 0,
  rapidReplacementDays: 30,
  anticipationDays: 90,
  monitoringDays: 180
});

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
