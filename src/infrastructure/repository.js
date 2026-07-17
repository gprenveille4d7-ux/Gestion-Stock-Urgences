import { DATABASE, DEFAULT_USER, REFERENCE_STATUS } from '../config.js';
import { createId } from '../domain/ids.js';
import { openOperationalDatabase, STORES } from './database.js';

export const SYNTHETIC_SOURCES = Object.freeze([
  'demo',
  'demo-synthetic',
  'synthetic',
  'example',
  'seed-demo'
]);

export const SYNTHETIC_DATA_MIGRATION_ID = 'synthetic-data-removal-v3';

const SYNTHETIC_SOURCE_SET = new Set(SYNTHETIC_SOURCES);

export function isSyntheticOperationalRecord(value) {
  return Boolean(value && SYNTHETIC_SOURCE_SET.has(String(value.source || '').trim().toLowerCase()));
}

function legacyOperations(legacy) {
  const importedAt = new Date().toISOString();
  const events = Array.isArray(legacy?.events) ? legacy.events : [];
  const actions = Array.isArray(legacy?.actions) ? legacy.actions : [];
  const operations = events.map((event, index) => ({
    store: 'events', type: 'put', value: {
      id: event.id || `legacy-event-${index + 1}`,
      type: event.type || 'LEGACY_EVENT_IMPORTED',
      subject: event.subject || 'Événement hérité',
      at: event.at || importedAt,
      userId: event.userId || event.user || DEFAULT_USER.id,
      correlationId: event.correlationId || 'legacy-localstorage-import',
      payload: event.payload || { detail: event.detail || '' },
      source: event.source || 'legacy-localstorage'
    }
  }));
  for (const [index, action] of actions.entries()) {
    operations.push({ store: 'actions', type: 'put', value: {
      ...action,
      id: action.id || `legacy-action-${index + 1}`,
      title: action.title || action.subject || 'Action héritée',
      status: action.status === 'done' ? 'done' : 'open',
      createdAt: action.createdAt || action.at || importedAt,
      source: action.source || 'legacy-localstorage'
    } });
  }
  operations.push({ store: 'metadata', type: 'put', value: {
    id: 'legacy-migration',
    importedAt,
    sourceKey: DATABASE.legacyLocalStorageKey,
    eventCount: events.length,
    actionCount: actions.length,
    source: 'system-migration'
  } });
  return operations;
}

/**
 * Prépare une migration non destructive : seules les lignes explicitement
 * marquées avec une source synthétique sont supprimées. Les outbox liées à un
 * événement supprimé le sont aussi afin de ne pas conserver de file orpheline.
 */
export function syntheticDataRemovalOperations(snapshot, migratedAt = new Date().toISOString()) {
  const operations = [];
  const removedIdsByStore = {};
  const removedEventIds = new Set();

  for (const store of STORES) {
    if (store === 'outbox') continue;
    for (const record of snapshot?.[store] || []) {
      const obsoleteReferenceMarker = store === 'metadata' && record?.status === 'demo-draft-needs-hospital-validation';
      const obsoleteSyntheticMarker = store === 'metadata' && ['demo-seed', 'demo-location-safety-v2'].includes(record?.id);
      const obsoleteLocalIdentity = store === 'settings' && record?.authentication === 'local-demo';
      if (!isSyntheticOperationalRecord(record) && !obsoleteReferenceMarker && !obsoleteSyntheticMarker && !obsoleteLocalIdentity) continue;
      if (!record?.id) continue;
      operations.push({ store, type: 'delete', id: record.id });
      (removedIdsByStore[store] ||= []).push(record.id);
      if (store === 'events') removedEventIds.add(record.id);
    }
  }

  for (const outbox of snapshot?.outbox || []) {
    if (!isSyntheticOperationalRecord(outbox) && !removedEventIds.has(outbox.eventId)) continue;
    if (!outbox?.id) continue;
    operations.push({ store: 'outbox', type: 'delete', id: outbox.id });
    (removedIdsByStore.outbox ||= []).push(outbox.id);
  }

  const removedByStore = Object.fromEntries(Object.entries(removedIdsByStore).map(([store, ids]) => [store, ids.length]));
  const removedTotal = Object.values(removedByStore).reduce((sum, count) => sum + count, 0);
  if (removedTotal > 0) {
    operations.push({ store: 'events', type: 'put', value: {
      id: `event:${SYNTHETIC_DATA_MIGRATION_ID}`,
      type: 'DATA_MIGRATION_COMPLETED',
      subject: 'Nettoyage des données non opérationnelles',
      at: migratedAt,
      userId: 'system',
      syncStatus: 'local',
      correlationId: SYNTHETIC_DATA_MIGRATION_ID,
      payload: { migrationId: SYNTHETIC_DATA_MIGRATION_ID, removedTotal, removedByStore },
      source: 'system-migration'
    } });
  }
  operations.push({ store: 'metadata', type: 'put', value: {
    id: SYNTHETIC_DATA_MIGRATION_ID,
    type: 'data-migration',
    version: 3,
    migratedAt,
    removedTotal,
    removedByStore,
    removedIdsByStore,
    removedSources: [...SYNTHETIC_SOURCES],
    source: 'system-migration'
  } });
  return operations;
}

export class OperationalRepository {
  constructor(database) {
    this.database = database;
  }

  static async create() {
    const database = await openOperationalDatabase();
    const repository = new OperationalRepository(database);
    await repository.initialize();
    return repository;
  }

  async initialize() {
    if (!(await this.database.get('metadata', 'legacy-migration'))) await this.migrateLegacyLocalStorage();

    if (!(await this.database.get('metadata', SYNTHETIC_DATA_MIGRATION_ID))) {
      const entries = await Promise.all(STORES.map(async (store) => [store, await this.database.getAll(store)]));
      await this.database.apply(syntheticDataRemovalOperations(Object.fromEntries(entries)));
    }

    const existingUserSetting = await this.database.get('settings', 'user');
    const userSetting = existingUserSetting || { ...DEFAULT_USER, id: 'user', userId: DEFAULT_USER.id };
    const existingLocalUser = await this.database.get('users', DEFAULT_USER.id);
    await this.database.apply([
      { store: 'metadata', type: 'put', value: { ...REFERENCE_STATUS, id: 'reference', referenceId: REFERENCE_STATUS.id, loadedAt: new Date().toISOString(), source: 'system-reference' } },
      { store: 'settings', type: 'put', value: userSetting },
      ...(!existingLocalUser ? [{ store: 'users', type: 'put', value: { ...DEFAULT_USER, active: true, permissions: [], source: 'system-local-user' } }] : [])
    ]);
  }

  async migrateLegacyLocalStorage() {
    let legacy = null;
    try {
      const raw = globalThis.localStorage?.getItem(DATABASE.legacyLocalStorageKey);
      if (raw) legacy = JSON.parse(raw);
    } catch (error) {
      await this.database.apply([{ store: 'metadata', type: 'put', value: {
        id: 'legacy-migration',
        importedAt: new Date().toISOString(),
        error: String(error),
        source: 'system-migration'
      } }]);
      return;
    }
    await this.database.apply(legacy ? legacyOperations(legacy) : [{ store: 'metadata', type: 'put', value: {
      id: 'legacy-migration',
      importedAt: new Date().toISOString(),
      sourceKey: DATABASE.legacyLocalStorageKey,
      eventCount: 0,
      actionCount: 0,
      source: 'system-migration'
    } }]);
  }

  async snapshot() {
    const entries = await Promise.all(STORES.map(async (store) => [store, await this.database.getAll(store)]));
    return Object.fromEntries(entries);
  }

  async commitEvent(event, consequences = {}, extraOperations = []) {
    const outbox = { id: createId('outbox'), eventId: event.id, status: 'pending', attempts: 0, createdAt: event.at, source: event.source || 'user-entry' };
    const eventSource = event.source || 'user-entry';
    const sourcedExtraOperations = extraOperations.map((operation) => (
      operation.type === 'put' && ['audits', 'observations', 'anomalies', 'actions', 'lots'].includes(operation.store) && operation.value && !operation.value.source
        ? { ...operation, value: { ...operation.value, source: eventSource } }
        : operation
    ));
    const operations = [
      { store: 'events', type: 'put', value: event },
      { store: 'outbox', type: 'put', value: outbox },
      ...(consequences.anomalies || []).map((value) => ({ store: 'anomalies', type: 'put', value: { ...value, source: value.source || eventSource } })),
      ...(consequences.actions || []).map((value) => ({ store: 'actions', type: 'put', value: { ...value, source: value.source || eventSource } })),
      ...sourcedExtraOperations
    ];
    await this.database.apply(operations);
  }

  put(store, value) {
    return this.database.apply([{ store, type: 'put', value }]);
  }

  apply(operations) {
    return this.database.apply(operations);
  }
}
