import { DATABASE, DEFAULT_USER, REFERENCE_STATUS } from '../config.js';
import { createDemoFixtures } from '../data/demo-fixtures.js';
import { createId } from '../domain/ids.js';
import { openOperationalDatabase, STORES } from './database.js';

function fixtureOperations(fixtures) {
  return [
    { store: 'metadata', type: 'put', value: fixtures.metadata },
    ...fixtures.events.map((value) => ({ store: 'events', type: 'put', value })),
    ...fixtures.actions.map((value) => ({ store: 'actions', type: 'put', value })),
    ...fixtures.anomalies.map((value) => ({ store: 'anomalies', type: 'put', value })),
    ...fixtures.lots.map((value) => ({ store: 'lots', type: 'put', value })),
    ...fixtures.audits.map((value) => ({ store: 'audits', type: 'put', value })),
    ...fixtures.observations.map((value) => ({ store: 'observations', type: 'put', value })),
    ...fixtures.users.map((value) => ({ store: 'users', type: 'put', value }))
  ];
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
      userId: event.user || DEFAULT_USER.id,
      correlationId: 'legacy-localstorage-import',
      payload: event.payload || { detail: event.detail || '' },
      source: 'legacy-localstorage'
    }
  }));
  for (const [index, action] of actions.entries()) {
    operations.push({ store: 'actions', type: 'put', value: {
      ...action,
      id: action.id || `legacy-action-${index + 1}`,
      title: action.title || action.subject || 'Action héritée',
      status: action.status === 'done' ? 'done' : 'open',
      createdAt: action.createdAt || action.at || importedAt,
      source: 'legacy-localstorage'
    } });
  }
  operations.push({ store: 'metadata', type: 'put', value: { id: 'legacy-migration', importedAt, sourceKey: DATABASE.legacyLocalStorageKey, eventCount: events.length, actionCount: actions.length } });
  return operations;
}

export function demoLocationSafetyOperations(actions, migratedAt = new Date().toISOString()) {
  const operations = (actions || [])
    .filter((action) => action.source === 'demo-synthetic' && (action.targetZoneId || action.finalZoneId || action.targetZoneStatus !== 'missing-to-validate' || action.finalZoneStatus !== 'missing-to-validate'))
    .map((action) => ({
      store: 'actions',
      type: 'put',
      value: { ...action, targetZoneId: null, targetZoneStatus: 'missing-to-validate', finalZoneId: null, finalZoneStatus: 'missing-to-validate' }
    }));
  operations.push({ store: 'metadata', type: 'put', value: { id: 'demo-location-safety-v2', migratedAt, actionCount: operations.length, source: 'safety-migration' } });
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
    const fixtures = createDemoFixtures();
    if (!(await this.database.get('metadata', 'demo-seed'))) {
      await this.database.apply(fixtureOperations(fixtures));
    }
    if (!(await this.database.get('users', 'local-demo-user'))) await this.database.apply(fixtures.users.map((value) => ({ store: 'users', type: 'put', value })));
    if (!(await this.database.get('metadata', 'demo-location-safety-v2'))) {
      await this.database.apply(demoLocationSafetyOperations(await this.database.getAll('actions')));
    }
    if (!(await this.database.get('metadata', 'legacy-migration'))) await this.migrateLegacyLocalStorage();
    await this.database.apply([
      { store: 'metadata', type: 'put', value: { id: 'reference', ...REFERENCE_STATUS, loadedAt: new Date().toISOString() } },
      { store: 'settings', type: 'put', value: (await this.database.get('settings', 'user')) || { id: 'user', ...DEFAULT_USER } }
    ]);
  }

  async migrateLegacyLocalStorage() {
    let legacy = null;
    try {
      const raw = globalThis.localStorage?.getItem(DATABASE.legacyLocalStorageKey);
      if (raw) legacy = JSON.parse(raw);
    } catch (error) {
      await this.database.apply([{ store: 'metadata', type: 'put', value: { id: 'legacy-migration', importedAt: new Date().toISOString(), error: String(error) } }]);
      return;
    }
    await this.database.apply(legacy ? legacyOperations(legacy) : [{ store: 'metadata', type: 'put', value: { id: 'legacy-migration', importedAt: new Date().toISOString(), sourceKey: DATABASE.legacyLocalStorageKey, eventCount: 0, actionCount: 0 } }]);
  }

  async snapshot() {
    const entries = await Promise.all(STORES.map(async (store) => [store, await this.database.getAll(store)]));
    return Object.fromEntries(entries);
  }

  async commitEvent(event, consequences = {}, extraOperations = []) {
    const outbox = { id: createId('outbox'), eventId: event.id, status: 'pending', attempts: 0, createdAt: event.at };
    const operations = [
      { store: 'events', type: 'put', value: event },
      { store: 'outbox', type: 'put', value: outbox },
      ...(consequences.anomalies || []).map((value) => ({ store: 'anomalies', type: 'put', value })),
      ...(consequences.actions || []).map((value) => ({ store: 'actions', type: 'put', value })),
      ...extraOperations
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
