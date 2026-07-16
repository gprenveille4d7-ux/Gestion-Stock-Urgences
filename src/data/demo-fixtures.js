import { REFERENCE_ITEMS } from './reference.js';

function idForLabel(label, containerId) {
  const item = REFERENCE_ITEMS.find((candidate) => candidate.label === label && (!containerId || candidate.containerId === containerId));
  return item?.id || null;
}

function isoAtOffset(now, days, hour = 8) {
  const date = new Date(now);
  date.setUTCHours(hour, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

export function createDemoFixtures(now = new Date()) {
  const createdAt = isoAtOffset(now, -1, 16);
  const biseptineId = idForLabel('Biseptine', 'sac-vert-pedia');
  const kt22Id = idForLabel('Cathéter 22 G bleu', 'sac-vert-pedia');
  const drillId = idForLabel('Perceuse intra-osseuse', 'valise-intra-osseuse');
  const actilyseId = idForLabel('Actilyse 50 mg', 'sac-jaune-fibrinolyse');
  const celocurineId = idForLabel('Célocurine 100 mg (suxaméthonium) ampoule', 'frigo-medicaments');
  const rapidRhinoId = idForLabel('Rapid Rhino', 'sac-plaies');
  const adrenalineId = idForLabel('Adrénaline 1 mg', 'sac-vert-pedia');

  return Object.freeze({
    metadata: {
      id: 'demo-seed',
      fixtureVersion: 1,
      source: 'demo-synthetic',
      seededAt: new Date(now).toISOString()
    },
    lots: [
      { id: 'lot-demo-actilyse', itemId: actilyseId, lotNumber: 'DEMO-ACT-01', expiryDate: isoAtOffset(now, 28), quantity: 2, status: 'active', source: 'demo-synthetic' },
      { id: 'lot-demo-celocurine', itemId: celocurineId, lotNumber: 'DEMO-CEL-02', expiryDate: isoAtOffset(now, 42), quantity: 2, status: 'active', source: 'demo-synthetic' },
      { id: 'lot-demo-rhino', itemId: rapidRhinoId, lotNumber: 'DEMO-RR-03', expiryDate: isoAtOffset(now, 73), quantity: 2, status: 'active', source: 'demo-synthetic' },
      { id: 'lot-demo-adrenaline', itemId: adrenalineId, lotNumber: 'DEMO-ADR-04', expiryDate: isoAtOffset(now, 105), quantity: 2, status: 'active', source: 'demo-synthetic' }
    ].filter((lot) => lot.itemId),
    anomalies: [
      { id: 'anomaly-demo-biseptine', type: 'manquant', subjectType: 'item', subjectId: biseptineId, containerId: 'sac-vert-pedia', quantity: 1, severity: 'attention', status: 'open', note: 'Fixture de démonstration', createdAt, source: 'demo-synthetic' },
      { id: 'anomaly-demo-kt22', type: 'manquant', subjectType: 'item', subjectId: kt22Id, containerId: 'sac-vert-pedia', quantity: 1, severity: 'attention', status: 'open', note: 'Fixture de démonstration', createdAt, source: 'demo-synthetic' },
      { id: 'anomaly-demo-drill', type: 'defaut_fonctionnel', subjectType: 'item', subjectId: drillId, containerId: 'valise-intra-osseuse', quantity: 1, severity: 'bloquant', status: 'open', note: 'Fixture de démonstration — aucun conseil clinique', createdAt, source: 'demo-synthetic' }
    ].filter((anomaly) => anomaly.subjectId),
    actions: [
      { id: 'action-demo-biseptine', type: 'rearmement', title: 'Ajouter 1 Biseptine', status: 'open', priority: 'haute', containerId: 'sac-vert-pedia', targetZoneId: 'pc-ide', finalZoneId: 'garage-smur', originAnomalyId: 'anomaly-demo-biseptine', lines: [{ itemId: biseptineId, quantity: 1, done: false }], createdAt, dueAt: isoAtOffset(now, 0, 18), source: 'demo-synthetic' },
      { id: 'action-demo-kt22', type: 'rearmement', title: 'Ajouter 1 KT 22 G', status: 'open', priority: 'haute', containerId: 'sac-vert-pedia', targetZoneId: 'reserve-1', finalZoneId: 'garage-smur', originAnomalyId: 'anomaly-demo-kt22', lines: [{ itemId: kt22Id, quantity: 1, done: false }], createdAt, dueAt: isoAtOffset(now, 0, 18), source: 'demo-synthetic' },
      { id: 'action-demo-drill', type: 'traitement_defaut', title: 'Traiter le défaut de la perceuse intra-osseuse', status: 'open', priority: 'critique', containerId: 'valise-intra-osseuse', targetZoneId: 'reserve-smur', finalZoneId: 'garage-smur', originAnomalyId: 'anomaly-demo-drill', lines: [{ itemId: drillId, quantity: 1, done: false }], createdAt, dueAt: isoAtOffset(now, 0, 18), source: 'demo-synthetic' }
    ].filter((action) => action.lines.every((line) => line.itemId)),
    events: [
      { id: 'event-demo-seeded', type: 'DEMO_DATA_SEEDED', subject: 'Jeu de données local', at: createdAt, userId: 'system', correlationId: 'demo-seed', payload: { fixtureVersion: 1 }, source: 'demo-synthetic' }
    ],
    audits: [],
    observations: [],
    users: [
      { id: 'local-demo-user', displayName: 'Utilisateur local', role: 'soignant', active: true, permissions: [], controlCount: 0, lastAssignedAt: null, source: 'demo-synthetic' },
      { id: 'demo-ide-a', displayName: 'IDE Démo A', role: 'soignant', active: true, permissions: [], controlCount: 2, lastAssignedAt: isoAtOffset(now, -14), source: 'demo-synthetic' },
      { id: 'demo-ide-b', displayName: 'IDE Démo B', role: 'soignant', active: true, permissions: [], controlCount: 1, lastAssignedAt: isoAtOffset(now, -30), source: 'demo-synthetic' },
      { id: 'demo-referent', displayName: 'Référent Démo', role: 'referent', active: true, permissions: [], controlCount: 3, lastAssignedAt: isoAtOffset(now, -7), source: 'demo-synthetic' }
    ]
  });
}
