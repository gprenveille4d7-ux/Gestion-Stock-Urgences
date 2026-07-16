import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { COMPOSITIONS, REFERENCE_NODES, SERVICE_ZONES, SMUR_CONTAINERS, REFERENCE_ITEMS } from '../src/data/reference.js';
import { deriveAvailability } from '../src/domain/availability.js';
import { deriveConsequences } from '../src/domain/action-engine.js';
import { resolveConflict } from '../src/domain/conflicts.js';
import { daysUntil, expiryStatus, filterLotsByHorizon } from '../src/domain/expiry.js';
import { planRoute } from '../src/domain/route-planner.js';
import { computePriority } from '../src/domain/priority.js';
import { computeStatistics } from '../src/domain/statistics.js';
import { OperationalStore } from '../src/application/operational-store.js';
import { LocalOnlySyncAdapter } from '../src/infrastructure/sync-adapter.js';

test('le référentiel SMUR est structuré, traçable et sans identifiants dupliqués', () => {
  assert.equal(SMUR_CONTAINERS.length, 13);
  assert.equal(REFERENCE_ITEMS.length, 361);
  assert.equal(new Set(REFERENCE_ITEMS.map((item) => item.id)).size, REFERENCE_ITEMS.length);
  assert.ok(REFERENCE_ITEMS.every((item) => item.sourceId && item.containerId && item.sectionId));
  assert.ok(REFERENCE_ITEMS.every((item) => item.productId?.startsWith('product:')));
  assert.ok(REFERENCE_ITEMS.every((item) => item.criticality === 'non_evaluee'));
  assert.equal(COMPOSITIONS.length, SMUR_CONTAINERS.length);
  assert.ok(REFERENCE_NODES.some((node) => node.kind === 'service'));
  assert.ok(COMPOSITIONS.every((composition) => composition.status === 'draft-to-validate' && composition.effectiveFrom === null));
  assert.equal(SERVICE_ZONES.filter((zone) => zone.type === 'uhcd').length, 6);
});

test('la disponibilité est calculée depuis les anomalies ouvertes', () => {
  const attention = deriveAvailability('sac-vert-pedia', { anomalies: [{ status: 'open', severity: 'attention', containerId: 'sac-vert-pedia', subjectId: REFERENCE_ITEMS[0].id, type: 'manquant' }], actions: [] });
  const blocking = deriveAvailability('sac-vert-pedia', { anomalies: [{ status: 'open', severity: 'bloquant', containerId: 'sac-vert-pedia', subjectId: REFERENCE_ITEMS[0].id, type: 'defectueux' }], actions: [] });
  const ready = deriveAvailability('sac-vert-pedia', { anomalies: [{ status: 'resolved', severity: 'bloquant', containerId: 'sac-vert-pedia', subjectId: REFERENCE_ITEMS[0].id, type: 'defectueux' }], actions: [] });
  assert.equal(attention.status, 'a_rearmer');
  assert.equal(blocking.status, 'indisponible');
  assert.equal(ready.status, 'pret');
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

test('le parcours groupe les actions et part de la zone choisie', () => {
  const route = planRoute([
    { id: 'a', status: 'open', targetZoneId: 'reserve-smur' },
    { id: 'b', status: 'open', targetZoneId: 'reserve-smur' },
    { id: 'c', status: 'open', targetZoneId: 'reserve-1' }
  ], 'pc-ide');
  assert.equal(route.length, 2);
  assert.equal(route[0].zone.id, 'reserve-1');
  assert.equal(route.find((step) => step.zone.id === 'reserve-smur').actions.length, 2);
  const withDestination = planRoute([{ id: 'd', status: 'open', targetZoneId: 'reserve-1', finalZoneId: 'garage-smur' }], 'pc-ide');
  assert.deepEqual(withDestination.map((step) => step.zone.id), ['reserve-1', 'garage-smur']);
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
  const initial = store.state.actions.find((action) => action.id === 'action-demo-biseptine');
  const itemId = initial.lines[0].itemId;
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
  assert.deepEqual(action.lines, [{ itemId: item.id, quantity: 1, done: false }]);
  assert.equal(store.state.anomalies.find((candidate) => candidate.id === action.originAnomalyId).family, 'usage_normal');

  const controlAction = await store.declareReturn({ containerId: container.id, sectionId: section.id, declaration: 'ouvert' });
  const audit = await store.startAudit(container.id, controlAction.id);
  assert.equal(audit.sectionId, section.id);
  assert.deepEqual(audit.plannedItemIds, section.items.map((candidate) => candidate.id));
  assert.equal(audit.referenceVersion, '2026.07-p0');
  assert.ok(audit.compositionId.startsWith('composition:sac-vert-pedia:'));
});

test('un contrôle interrompu conserve sa position, sa passation et sa reprise', async () => {
  const store = await OperationalStore.create(null);
  const audit = await store.startAudit('sac-bleu-respi');
  const firstItemId = audit.plannedItemIds[0];
  await store.recordAuditObservation({ auditId: audit.id, itemId: firstItemId, result: 'conforme' });
  await store.pauseAudit(audit.id);
  await store.assignAudit(audit.id, 'demo-ide-b', 'remplacement pendant absence');
  const resumed = await store.resumeAudit(audit.id);
  assert.equal(resumed.lastItemId, firstItemId);
  assert.equal(resumed.userId, 'local-demo-user');
  assert.ok(resumed.assigneeHistory.some((entry) => entry.userId === 'demo-ide-b'));
  assert.ok(store.state.events.some((event) => event.type === 'AUDIT_PAUSED'));
  assert.ok(store.state.events.some((event) => event.type === 'AUDIT_REASSIGNED'));
  assert.ok(store.state.events.some((event) => event.type === 'AUDIT_RESUMED'));
});

test('un remplacement de péremption clôture l’ancien lot et enregistre le nouveau', async () => {
  const store = await OperationalStore.create(null);
  const oldLot = store.state.lots.find((lot) => lot.id === 'lot-demo-actilyse');
  const action = await store.planExpiryReplacement(oldLot.id);
  await store.toggleActionLine(action.id, action.lines[0].itemId);
  await store.advanceAction(action.id);
  await store.advanceAction(action.id);
  const newLot = await store.completeExpiryAction(action.id, { lotNumber: 'TEST-NEW-01', expiryMonth: '2028-03', quantity: 2 });
  assert.equal(store.state.lots.find((lot) => lot.id === oldLot.id).status, 'replaced');
  assert.equal(newLot.status, 'active');
  assert.equal(newLot.expiryDate.slice(0, 10), '2028-03-31');
  assert.ok(store.state.events.some((event) => event.type === 'EXPIRY_REPLACED'));
});

test('l’adaptateur local conserve toute l’outbox sans simuler un envoi', async () => {
  const result = await new LocalOnlySyncAdapter().synchronize([{ status: 'pending' }, { status: 'pending' }]);
  assert.equal(result.status, 'local-only');
  assert.equal(result.pending, 2);
  assert.equal(result.sent, 0);
});

test('un équipement présent mais déclaré défectueux peut rendre son contenant indisponible', async () => {
  const store = await OperationalStore.create(null);
  const item = REFERENCE_ITEMS.find((candidate) => candidate.label === 'Perceuse intra-osseuse');
  const action = await store.reportDefect({ containerId: item.containerId, itemId: item.id, note: 'test fonctionnel non conforme', blocking: true });
  assert.equal(action.priority, 'critique');
  assert.equal(deriveAvailability(item.containerId, store.state).status, 'indisponible');
  assert.ok(REFERENCE_ITEMS.includes(item));
});
