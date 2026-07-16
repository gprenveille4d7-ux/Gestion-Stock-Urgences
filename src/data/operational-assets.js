export const ASSET_TYPES = Object.freeze(['vehicule', 'equipement', 'dispositif_reutilisable']);

export const OPERATIONAL_ASSETS = Object.freeze([
  Object.freeze({
    id: 'vehicle-demo-smur-01',
    type: 'vehicule',
    label: 'Véhicule SMUR 01 — démonstration',
    homeZoneId: 'garage-smur',
    sourceStatus: 'demo-synthetic',
    activeReferenceVersion: null,
    attributes: Object.freeze({ immatriculation: null, fleetCode: 'DEMO-SMUR-01' })
  }),
  Object.freeze({
    id: 'equipment-demo-monitor-01',
    type: 'equipement',
    label: 'Moniteur-défibrillateur — démonstration',
    homeZoneId: 'reserve-smur',
    sourceStatus: 'demo-synthetic',
    activeReferenceVersion: null,
    attributes: Object.freeze({ serialNumber: null, maintenanceProvider: null })
  }),
  Object.freeze({
    id: 'equipment-demo-ventilator-01',
    type: 'equipement',
    label: 'Respirateur — démonstration',
    homeZoneId: 'reserve-respi',
    sourceStatus: 'demo-synthetic',
    activeReferenceVersion: null,
    attributes: Object.freeze({ serialNumber: null, maintenanceProvider: null })
  })
]);

