import { DATABASE } from '../config.js';

export const STORES = Object.freeze([
  'metadata',
  'events',
  'audits',
  'observations',
  'anomalies',
  'actions',
  'lots',
  'outbox',
  'settings',
  'users'
]);

function requestAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Erreur IndexedDB'));
  });
}

class IndexedDatabase {
  constructor(database) {
    this.database = database;
    this.persistent = true;
  }

  async get(storeName, id) {
    const transaction = this.database.transaction(storeName, 'readonly');
    return requestAsPromise(transaction.objectStore(storeName).get(id));
  }

  async getAll(storeName) {
    const transaction = this.database.transaction(storeName, 'readonly');
    return requestAsPromise(transaction.objectStore(storeName).getAll());
  }

  async apply(operations) {
    if (!operations.length) return;
    const storeNames = [...new Set(operations.map((operation) => operation.store))];
    await new Promise((resolve, reject) => {
      const transaction = this.database.transaction(storeNames, 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Transaction IndexedDB interrompue'));
      transaction.onabort = () => reject(transaction.error || new Error('Transaction IndexedDB annulée'));
      for (const operation of operations) {
        const store = transaction.objectStore(operation.store);
        if (operation.type === 'delete') store.delete(operation.id);
        else if (operation.type === 'clear') store.clear();
        else store.put(operation.value);
      }
    });
  }
}

class MemoryDatabase {
  constructor() {
    this.persistent = false;
    this.stores = new Map(STORES.map((store) => [store, new Map()]));
  }

  async get(storeName, id) {
    return this.stores.get(storeName)?.get(id);
  }

  async getAll(storeName) {
    return [...(this.stores.get(storeName)?.values() || [])];
  }

  async apply(operations) {
    for (const operation of operations) {
      const store = this.stores.get(operation.store);
      if (operation.type === 'clear') store.clear();
      else if (operation.type === 'delete') store.delete(operation.id);
      else store.set(operation.value.id, structuredClone(operation.value));
    }
  }
}

export async function openOperationalDatabase() {
  if (!globalThis.indexedDB) return new MemoryDatabase();
  return new Promise((resolve) => {
    const request = indexedDB.open(DATABASE.name, DATABASE.version);
    let fallbackUsed = false;
    const useMemoryFallback = (error) => {
      if (fallbackUsed) return;
      fallbackUsed = true;
      console.warn('IndexedDB indisponible, passage en mémoire temporaire', error);
      resolve(new MemoryDatabase());
    };
    request.onupgradeneeded = () => {
      const database = request.result;
      for (const storeName of STORES) {
        if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      if (fallbackUsed) request.result.close();
      else resolve(new IndexedDatabase(request.result));
    };
    request.onerror = () => useMemoryFallback(request.error || new Error("Impossible d'ouvrir IndexedDB"));
    request.onblocked = () => useMemoryFallback(new Error('Mise à niveau IndexedDB bloquée par un autre onglet'));
  });
}
