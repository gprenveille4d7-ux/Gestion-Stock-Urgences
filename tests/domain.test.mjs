import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { REFERENCE_STATUS } from '../src/config.js';
import { COMPOSITIONS, REFERENCE_NODES, SERVICE_ZONES, SMUR_CONTAINERS, REFERENCE_ITEMS } from '../src/data/reference.js';
import { deriveAvailability } from '../src/domain/availability.js';
import { deriveConsequences } from '../src/domain/action-engine.js';
import { resolveConflict } from '../src/domain/conflicts.js';
import { computeExpiryDashboard, daysUntil, expiryStatus, filterLotsByHorizon } from '../src/domain/expiry.js';
import { actionZoneId, planRoute } from '../src/domain/route-planner.js';
import { computePriority } from '../src/domain/priority.js';
import { computeStatistics } from '../src/domain/statistics.js';
import { OperationalStore } from '../src/application/operational-store.js';
import { LocalOnlySyncAdapter } from '../src/infrastructure/sync-adapter.js';
import { openOperationalDatabase } from '../src/infrastructure/database.js';
import { syntheticDataRemovalOperations } from '../src/infrastructure/repository.js';

test('le référentiel SMUR est structuré, traçable et sans identifiants dupliqués', () => {
  assert.equal(SMUR_CONTAINERS.length, 13);
  assert.equal(REFERENCE_ITEMS.length, 361);
  assert.equal(new Set(REFERENCE_ITEMS.map((item) => item.id)).size, REFERENCE_ITEMS.length);
  assert.ok(REFERENCE_ITEMS.every((item) => item.sourceId && item.containerId && item.sectionId));
  assert.ok(REFERENCE_ITEMS.every((item) => item.productId?.startsWith('product:')));
  assert.ok(REFERENCE_ITEMS.every((item) => item.criticality === 'non_evaluee'));
  assert.ok(REFERENCE_ITEMS.every((item) => item.supplyZoneId === null));
  assert.ok(SMUR_CONTAINERS.every((container) => container.stockZoneStatus === 'physical-layout-provisional' && container.physicalLayoutStatus === 'physical-layout-provisional'));
  assert.ok(REFERENCE_NODES.filter((node) => SMUR_CONTAINERS.some((container) => container.id === node.id)).every((node) => node.parentId === 'service:urgences-falaise' && node.proposedParentId?.startsWith('zone:')));
  assert.equal(COMPOSITIONS.length, SMUR_CONTAINERS.length);
  assert.ok(REFERENCE_NODES.some((node) => node.kind === 'service'));
  assert.ok(COMPOSITIONS.every((composition) => composition.status === 'imported-from-source' && composition.effectiveFrom === null));
  assert.equal(SERVICE_ZONES.filter((zone) => zone.type === 'uhcd').length, 6);
  const intraOsseousItems = SMUR_CONTAINERS.find((container) => container.id === 'valise-intra-osseuse').sections[0].items;
  assert.equal(intraOsseousItems.length, 12);
  assert.ok(intraOsseousItems.every((item) => item.sourceText));
  assert.ok(intraOsseousItems.find((item) => item.label.includes('jaune')).sourceText.includes('45GA'));
  assert.ok(intraOsseousItems.filter((item) => ['rose', 'bleue'].some((color) => item.label.includes(color))).every((item) => item.sourceText.includes('15GA')));
  assert.ok(intraOsseousItems.find((item) => item.sourceText.startsWith('SERINGUE DE 50 LUER LOCK')).label.includes('unité source absente'));
  assert.equal(intraOsseousItems.find((item) => item.sourceText === 'SERINGUES PRE-REMPLIES').operationalUseAllowed, false);
  const compressPacks = intraOsseousItems.find((item) => item.sourceText === 'PAQUETS DE 5 COMPRESSES STERILES');
  assert.equal(compressPacks.unit, 'paquet');
  assert.equal(compressPacks.packSize, 5);
});

test('la disponibilité est calculée depuis les anomalies ouvertes', () => {
  const attention = deriveAvailability('sac-vert-pedia', { anomalies: [{ status: 'open', severity: 'attention', containerId: 'sac-vert-pedia', subjectId: REFERENCE_ITEMS[0].id, type: 'manquant' }], actions: [] });
  const blocking = deriveAvailability('sac-vert-pedia', { anomalies: [{ status: 'open', severity: 'bloquant', containerId: 'sac-vert-pedia', subjectId: REFERENCE_ITEMS[0].id, type: 'defectueux' }], actions: [] });
  const ready = deriveAvailability('sac-vert-pedia', { anomalies: [{ status: 'resolved', severity: 'bloquant', containerId: 'sac-vert-pedia', subjectId: REFERENCE_ITEMS[0].id, type: 'defectueux' }], actions: [] });
  assert.equal(attention.status, 'a_rearmer');
  assert.equal(blocking.status, 'indisponible');
  assert.equal(ready.status, 'pret');
  assert.deepEqual(ready.reasons, []);
});

test('le moteur transforme une observation non conforme en anomalie et action', () => {
  const event = { id: 'event-test', type: 'AUDIT_OBSERVATION_RECORDED', at: '2026-07-16T12:00:00.000Z', payload: { result: 'manquant', itemId: 'item-1', containerId: 'sac-1', missingQuantity: 2, severity: 'attention' } };
  const result = deriveConsequences(event, { targetZoneId: 'reserve-1', actionTitle: 'Réarmer item' });
  assert.equal(result.anomalies.length, 1);
  assert.equal(result.actions.length, 1);
  assert.equal(result.actions[0].lines[0].quantity, 2);
  assert.equal(result.actions[0].originAnomalyId, result.anomalies[0].id);
});

test('les horizons de péremption sont déterministes', () => {
  const now = new Date('2026-07-16T10:00:00.000Z');
  assert.equal(daysUntil('2026-07-16T20:00:00.000Z', now), 0);
  assert.equal(expiryStatus('2026-07-15T00:00:00.000Z', now), 'perime');
  assert.equal(expiryStatus('2026-08-10T00:00:00.000Z', now), 'critique');
  const lots = filterLotsByHorizon([{ id: 'a', status: 'active', expiryDate: '2026-07-20' }, { id: 'b', status: 'active', expiryDate: '2027-01-01' }], 30, now);
  assert.deepEqual(lots.map((lot) => lot.id), ['a']);
});

test('les quatre compteurs de péremption proviennent uniquement des lots réellement enregistrés', () => {
  const now = new Date('2026-07-17T12:00:00.000Z');
  const dashboard = computeExpiryDashboard([
    { id: 'expired', itemId: 'item-expired', status: 'active', expiryDate: '2026-07-16T23:59:59.999Z', source: 'user-entry' },
    { id: 'rapid', itemId: 'item-rapid', status: 'active', expiryDate: '2026-08-06T23:59:59.999Z', source: 'user-entry' },
    { id: 'anticipate', itemId: 'item-anticipate', status: 'active', expiryDate: '2026-09-15T23:59:59.999Z', source: 'user-entry' },
    { id: 'archived', itemId: 'item-archived', status: 'archived', expiryDate: '2026-07-01T23:59:59.999Z', archivedAt: '2026-07-10T10:00:00.000Z', replacementLotId: 'replacement', source: 'user-entry' }
  ], now);
  assert.deepEqual(dashboard.counts, { 'to-treat': 1, 'within-30': 1, 'within-90': 1, 'treated-this-month': 1 });
});

test('une installation neuve ne contient aucune donnée opérationnelle préchargée', async () => {
  const store = await OperationalStore.create(null);
  assert.equal(store.state.events.length, 0);
  assert.equal(store.state.actions.length, 0);
  assert.equal(store.state.lots.length, 0);
  assert.equal(store.state.audits.length, 0);
  assert.equal(store.state.observations.length, 0);
  assert.deepEqual(store.getExpiryDashboard(new Date('2026-07-17T12:00:00.000Z')).counts, {
    'to-treat': 0,
    'within-30': 0,
    'within-90': 0,
    'treated-this-month': 0
  });
  const thresholds = await store.setExpiryThresholds({ urgentDays: 0, rapidReplacementDays: 20, anticipationDays: 75, monitoringDays: 150 });
  assert.deepEqual(thresholds, { urgentDays: 0, rapidReplacementDays: 20, anticipationDays: 75, monitoringDays: 150 });
});

test('le parcours groupe les actions et part de la zone choisie', () => {
  const route = planRoute([
    { id: 'a', status: 'open', targetZoneId: 'reserve-smur', targetZoneStatus: 'validated' },
    { id: 'b', status: 'open', targetZoneId: 'reserve-smur', targetZoneStatus: 'validated' },
    { id: 'c', status: 'open', targetZoneId: 'reserve-1', targetZoneStatus: 'validated' }
  ], 'pc-ide');
  assert.equal(route.length, 2);
  assert.equal(route[0].zone.id, 'reserve-1');
  assert.equal(route.find((step) => step.zone.id === 'reserve-smur').actions.length, 2);
  const withDestination = planRoute([{ id: 'd', status: 'open', targetZoneId: 'reserve-1', targetZoneStatus: 'validated', finalZoneId: 'garage-smur', finalZoneStatus: 'validated' }], 'pc-ide');
  assert.deepEqual(withDestination.map((step) => step.zone.id), ['reserve-1', 'garage-smur']);
  assert.deepEqual(planRoute([{ id: 'unknown', status: 'open', targetZoneId: null }], 'pc-ide'), []);
  assert.deepEqual(planRoute([{ id: 'unknown-final', status: 'open', targetZoneId: null, finalZoneId: 'reserve-smur' }], 'pc-ide'), []);
  assert.deepEqual(planRoute([{ id: 'legacy-location', status: 'open', targetZoneId: 'reserve-1' }], 'pc-ide'), []);
  assert.equal(actionZoneId({ stage: 'remise_en_place', finalZoneId: 'reserve-smur' }), null);
  assert.deepEqual(planRoute([{ id: 'known-final-stage', status: 'open', stage: 'remise_en_place', targetZoneId: null, finalZoneId: 'reserve-smur', finalZoneStatus: 'validated' }], 'pc-ide').map((step) => step.zone.id), ['reserve-smur']);
  assert.equal(withDestination.at(-1).role, 'destination_finale');
});

test('la priorité reste explicable par gravité, échéance et ancienneté', () => {
  const now = new Date('2026-07-16T12:00:00Z');
  const critical = computePriority({ severity: 'bloquant', type: 'traitement_defaut', dueAt: '2026-07-16T12:00:00Z' }, now);
  const planned = computePriority({ severity: 'attention', type: 'remplacement_peremption', dueAt: '2027-01-01T00:00:00Z' }, now);
  assert.equal(critical.level, 'critique');
  assert.ok(critical.reasons.includes('cause bloquante'));
  assert.equal(planned.level, 'planifiee');
});

test('les statistiques sont calculées depuis le journal et les actions', () => {
  const stats = computeStatistics({ events: [{ type: 'A' }, { type: 'B' }], audits: [{ status: 'completed' }], actions: [{ status: 'done', createdAt: '2026-07-16T10:00:00Z', completedAt: '2026-07-16T10:30:00Z' }, { status: 'open' }] });
  assert.equal(stats.totalEvents, 2);
  assert.equal(stats.openActions, 1);
  assert.equal(stats.averageResolutionMinutes, 30);
});

test('les conflits sensibles restent visibles et les événements sont dédupliqués', () => {
  assert.equal(resolveConflict('event', { id: 'e1' }, { id: 'e1' }).status, 'deduplicated');
  assert.equal(resolveConflict('lotExpiry', { lot: 'A', expiry: '2026-10' }, { lot: 'A', expiry: '2027-03' }).status, 'review_required');
  const action = resolveConflict('action', { id: 'a', status: 'done', completedAt: '2026-07-16T10:00:00Z', completionEventId: 'e1' }, { id: 'a', status: 'done', completedAt: '2026-07-16T10:01:00Z', completionEventId: 'e2' });
  assert.deepEqual(action.merged.completionEvents, ['e1', 'e2']);
});

test('les classeurs historiques excluent péremptions et signatures du JSON applicatif', async () => {
  const json = JSON.parse(await readFile(new URL('../src/data/chariot-reference.json', import.meta.url), 'utf8'));
  const count = json.references.flatMap((reference) => reference.containers.flatMap((container) => container.items)).length;
  assert.equal(count, 357);
  assert.ok(json.sources.every((source) => source.excludedFields.includes('expiry') && source.excludedFields.includes('signature')));
  assert.equal(JSON.stringify(json).includes('expiryDate'), false);
});

test('un écart de contrôle est persisté atomiquement avec son action et son événement', async () => {
  const store = await OperationalStore.create(null);
  const audit = await store.startAudit('sac-vert-pedia');
  const item = REFERENCE_ITEMS.find((candidate) => candidate.containerId === 'sac-vert-pedia');
  const previousEvents = store.state.events.length;
  await store.recordAuditObservation({ auditId: audit.id, itemId: item.id, result: 'manquant', observedQuantity: 0, note: 'test', severity: 'attention' });
  assert.ok(store.state.observations.some((observation) => observation.auditId === audit.id && observation.itemId === item.id));
  assert.ok(store.state.actions.some((action) => action.lines?.some((line) => line.itemId === item.id) && action.originAnomalyId));
  assert.ok(store.state.events.length > previousEvents);
  assert.ok(store.state.outbox.some((entry) => entry.status === 'pending'));
});

test('le réarmement complet journalise chaque transition et résout son anomalie', async () => {
  const store = await OperationalStore.create(null);
  const item = REFERENCE_ITEMS.find((candidate) => candidate.containerId === 'sac-vert-pedia' && candidate.operationalUseAllowed !== false);
  let initial = await store.declareReturn({ containerId: item.containerId, sectionId: item.sectionId, itemId: item.id, declaration: 'manquant', quantity: 1 });
  const itemId = initial.lines[0].itemId;
  await assert.rejects(() => store.toggleActionLine(initial.id, itemId), /Emplacement de prélèvement à confirmer/);
  await assert.rejects(() => store.completeAction(initial.id), /étapes de collecte et de vérification/);
  await store.repository.put('actions', { ...initial, targetZoneId: 'reserve-1', targetZoneStatus: 'validated', finalZoneId: 'garage-smur', finalZoneStatus: 'validated' });
  await store.reload(false);
  initial = store.state.actions.find((action) => action.id === initial.id);
  await store.toggleActionLine(initial.id, itemId);
  await store.advanceAction(initial.id);
  await store.advanceAction(initial.id);
  await store.advanceAction(initial.id);
  const completed = store.state.actions.find((action) => action.id === initial.id);
  const anomaly = store.state.anomalies.find((candidate) => candidate.id === initial.originAnomalyId);
  assert.equal(completed.status, 'done');
  assert.equal(anomaly.status, 'resolved');
  assert.ok(store.state.events.some((event) => event.type === 'ACTION_LINE_TOGGLED'));
  assert.ok(store.state.events.some((event) => event.type === 'ACTION_STAGE_CHANGED'));
  assert.ok(store.state.events.some((event) => event.type === 'ACTION_COMPLETED'));
});

test('un retour ciblé crée un réarmement direct et un contrôle de kit fige seulement ce kit', async () => {
  const store = await OperationalStore.create(null);
  const container = SMUR_CONTAINERS.find((candidate) => candidate.id === 'sac-vert-pedia');
  const section = container.sections.find((candidate) => candidate.id.endsWith(':kit-perfusion'));
  const item = section.items.find((candidate) => candidate.label.includes('Cathéter 22 G'));
  const action = await store.declareReturn({ containerId: container.id, sectionId: section.id, itemId: item.id, declaration: 'utilise', quantity: 1 });
  assert.equal(action.type, 'rearmement');
  assert.equal(action.targetZoneId, null);
  assert.equal(action.finalZoneId, null);
  assert.deepEqual(action.lines, [{ itemId: item.id, quantity: 1, done: false }]);
  assert.equal(store.state.anomalies.find((candidate) => candidate.id === action.originAnomalyId).family, 'usage_normal');

  const controlAction = await store.declareReturn({ containerId: container.id, sectionId: section.id, declaration: 'ouvert' });
  assert.equal(controlAction.finalZoneId, null);
  const audit = await store.startAudit(container.id, controlAction.id);
  assert.equal(audit.sectionId, section.id);
  assert.deepEqual(audit.plannedItemIds, section.items.map((candidate) => candidate.id));
  assert.equal(audit.referenceVersion, REFERENCE_STATUS.version);
  assert.ok(audit.compositionId.startsWith('composition:sac-vert-pedia:'));
  const ioContainer = SMUR_CONTAINERS.find((candidate) => candidate.id === 'valise-intra-osseuse');
  const ambiguousItem = ioContainer.sections[0].items.find((candidate) => candidate.sourceText === 'SERINGUES PRE-REMPLIES');
  await assert.rejects(() => store.declareReturn({ containerId: ioContainer.id, sectionId: ioContainer.sections[0].id, itemId: ambiguousItem.id, declaration: 'utilise' }), /validation humaine requise/);
});

test('un contrôle interrompu conserve sa position, sa passation et sa reprise', async () => {
  const store = await OperationalStore.create(null);
  await store.repository.put('users', { id: 'field-user', displayName: 'Utilisateur terrain', role: 'soignant', active: true, source: 'user-entry' });
  await store.reload(false);
  const audit = await store.startAudit('sac-bleu-respi');
  const firstItemId = audit.plannedItemIds[0];
  await store.recordAuditObservation({ auditId: audit.id, itemId: firstItemId, result: 'conforme' });
  await store.pauseAudit(audit.id);
  await store.assignAudit(audit.id, 'field-user', 'remplacement pendant absence');
  const resumed = await store.resumeAudit(audit.id);
  assert.equal(resumed.lastItemId, firstItemId);
  assert.equal(resumed.userId, 'local-user');
  assert.ok(resumed.assigneeHistory.some((entry) => entry.userId === 'field-user'));
  assert.ok(store.state.events.some((event) => event.type === 'AUDIT_PAUSED'));
  assert.ok(store.state.events.some((event) => event.type === 'AUDIT_REASSIGNED'));
  assert.ok(store.state.events.some((event) => event.type === 'AUDIT_RESUMED'));
});

test('un remplacement de péremption clôture l’ancien lot et enregistre le nouveau', async () => {
  const store = await OperationalStore.create(null);
  const item = REFERENCE_ITEMS.find((candidate) => candidate.expiryTracked);
  const oldLot = await store.addTrackedLot({
    itemId: item.id,
    containerId: item.containerId,
    sectionId: item.sectionId,
    lotNumber: 'LOT-TERRAIN-01',
    expiryMonth: '2026-08',
    quantity: 2
  });
  const action = await store.planExpiryReplacement(oldLot.id);
  assert.equal(oldLot.source, 'user-entry');
  assert.equal(oldLot.lotNumber, 'LOT-TERRAIN-01');
  assert.equal(oldLot.expiryMonth, '2026-08');
  assert.equal(oldLot.quantityPresent, 2);
  assert.equal(oldLot.referenceSnapshot.expectedQuantity, item.expectedQuantity);
  assert.equal(oldLot.observedLocation.containerId, item.containerId);
  assert.equal(action.stage, 'localiser');
  assert.equal(action.targetZoneId, null);
  assert.equal(action.finalZoneId, null);
  await store.localizeExpiryAction(action.id);
  await store.removeExpiryLot(action.id, { quantity: 2, reason: 'remplacement programmé' });
  await store.replaceExpiryLot(action.id, { lotNumber: 'LOT-TERRAIN-02', expiryMonth: '2028-03', quantity: 2 });
  await assert.rejects(() => store.validateExpiryReplacement(action.id, { oldProductRemoved: true }), /vérifications finales/);
  const newLot = await store.validateExpiryReplacement(action.id, {
    oldProductRemoved: true,
    newProductInstalled: true,
    quantityCompliant: true,
    dateRecorded: true,
    containerAvailable: true
  });
  assert.equal(store.state.lots.find((lot) => lot.id === oldLot.id).status, 'archived');
  assert.equal(newLot.status, 'active');
  assert.equal(newLot.expiryDate.slice(0, 10), '2028-03-31');
  for (const eventType of ['LOT_RECORDED', 'EXPIRY_REPLACEMENT_PLANNED', 'EXPIRY_ITEM_LOCATED', 'EXPIRY_LOT_WITHDRAWN', 'EXPIRY_REPLACEMENT_RECORDED', 'EXPIRY_REPLACED']) {
    assert.ok(store.state.events.some((event) => event.type === eventType), `${eventType} doit être journalisé`);
  }
  assert.ok(store.state.lots.find((lot) => lot.id === oldLot.id).history.some((entry) => entry.type === 'replacement-validated'));
  assert.equal(store.getExpiryDashboard(new Date()).counts['treated-this-month'], 1);
});

test('l’adaptateur local conserve toute l’outbox sans simuler un envoi', async () => {
  const result = await new LocalOnlySyncAdapter().synchronize([{ status: 'pending' }, { status: 'pending' }]);
  assert.equal(result.status, 'local-only');
  assert.equal(result.pending, 2);
  assert.equal(result.sent, 0);

  const migrationOperations = syntheticDataRemovalOperations({
    metadata: [], events: [{ id: 'event-synthetic', source: 'demo' }, { id: 'event-user', source: 'user-entry' }],
    audits: [{ id: 'audit-synthetic', source: 'synthetic' }], observations: [], anomalies: [{ id: 'anomaly-synthetic', source: 'example' }],
    actions: [{ id: 'action-synthetic', source: 'demo-synthetic' }, { id: 'action-user', source: 'local-pwa' }],
    lots: [{ id: 'lot-synthetic', source: 'seed-demo' }, { id: 'lot-user', source: 'user-entry' }],
    outbox: [{ id: 'outbox-synthetic', eventId: 'event-synthetic' }, { id: 'outbox-user', eventId: 'event-user' }],
    settings: [], users: []
  }, '2026-07-17T00:00:00.000Z');
  const deleted = migrationOperations.filter((operation) => operation.type === 'delete');
  assert.deepEqual(deleted.map((operation) => operation.id).sort(), ['action-synthetic', 'anomaly-synthetic', 'audit-synthetic', 'event-synthetic', 'lot-synthetic', 'outbox-synthetic']);
  assert.equal(deleted.some((operation) => operation.id.endsWith('user')), false);
  const migrationLog = migrationOperations.find((operation) => operation.store === 'metadata' && operation.type === 'put').value;
  assert.equal(migrationLog.removedTotal, 6);
  const migrationEvent = migrationOperations.find((operation) => operation.store === 'events' && operation.type === 'put').value;
  assert.equal(migrationEvent.type, 'DATA_MIGRATION_COMPLETED');
  assert.equal(migrationEvent.payload.removedTotal, 6);

  const previousIndexedDB = globalThis.indexedDB;
  globalThis.indexedDB = {
    open() {
      const request = {};
      queueMicrotask(() => {
        request.error = new Error('indisponible pour le test');
        request.onerror();
      });
      return request;
    }
  };
  try {
    const fallbackDatabase = await openOperationalDatabase();
    assert.equal(fallbackDatabase.persistent, false);
  } finally {
    if (previousIndexedDB === undefined) delete globalThis.indexedDB;
    else globalThis.indexedDB = previousIndexedDB;
  }
});

test('un équipement présent mais déclaré défectueux peut rendre son contenant indisponible', async () => {
  const store = await OperationalStore.create(null);
  const item = REFERENCE_ITEMS.find((candidate) => candidate.label === 'Perceuse intra-osseuse');
  const action = await store.reportDefect({ containerId: item.containerId, itemId: item.id, note: 'test fonctionnel non conforme', blocking: true });
  assert.equal(action.priority, 'critique');
  assert.equal(action.targetZoneId, null);
  assert.equal(action.finalZoneId, null);
  assert.equal(deriveAvailability(item.containerId, store.state).status, 'indisponible');
  assert.ok(REFERENCE_ITEMS.includes(item));
});
