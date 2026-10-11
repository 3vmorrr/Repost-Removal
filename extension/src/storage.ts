import type { RepostRecord, RunState } from './shared';

const DB_NAME = 'tiktok-repost-remover';
const STORE_NAME = 'reposts';

function request<T>(value: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    value.onsuccess = () => resolve(value.result);
    value.onerror = () => reject(value.error ?? new Error('IndexedDB request failed.'));
  });
}

function transactionDone(value: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    value.oncomplete = () => resolve();
    value.onerror = () => reject(value.error ?? new Error('IndexedDB transaction failed.'));
    value.onabort = () => reject(value.error ?? new Error('IndexedDB transaction was aborted.'));
  });
}

async function database(): Promise<IDBDatabase> {
  const open = indexedDB.open(DB_NAME, 1);
  open.onupgradeneeded = () => open.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
  return request(open);
}

export async function clearItems(): Promise<void> {
  const db = await database();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).clear();
  await transactionDone(transaction);
  db.close();
}

export async function addItems(items: Omit<RepostRecord, 'selected' | 'status' | 'error' | 'updatedAt' | 'scanPage'>[], scanPage: number): Promise<number> {
  const db = await database();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  let added = 0;
  for (const item of items) {
    const get = store.get(item.id);
    get.onsuccess = () => {
      if (get.result) return;
      store.add({ ...item, selected: false, status: 'pending', error: '', updatedAt: Date.now(), scanPage } satisfies RepostRecord);
      added += 1;
    };
  }
  await transactionDone(transaction);
  db.close();
  return added;
}

export async function getItems(): Promise<RepostRecord[]> {
  const db = await database();
  const items = await request(db.transaction(STORE_NAME).objectStore(STORE_NAME).getAll()) as RepostRecord[];
  db.close();
  return items;
}

export async function getItemsPage(query: string, offset: number, limit: number): Promise<{ items: RepostRecord[]; total: number }> {
  const db = await database();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const cursor = transaction.objectStore(STORE_NAME).openCursor();
  const items: RepostRecord[] = [];
  const normalized = query.trim().toLocaleLowerCase();
  let total = 0;
  cursor.onsuccess = () => {
    const entry = cursor.result;
    if (!entry) return;
    const item = entry.value as RepostRecord;
    const matches = !normalized || `${item.creator}\n${item.description}\n${item.id}`.toLocaleLowerCase().includes(normalized);
    if (matches) {
      if (total >= offset && items.length < limit) items.push(item);
      total += 1;
    }
    entry.continue();
  };
  await transactionDone(transaction);
  db.close();
  return { items, total };
}

export async function updateItem(id: string, patch: Partial<RepostRecord>): Promise<RepostRecord | null> {
  const db = await database();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const item = await request(store.get(id)) as RepostRecord | undefined;
  if (!item) {
    await transactionDone(transaction);
    db.close();
    return null;
  }
  const updated = { ...item, ...patch, updatedAt: Date.now() };
  store.put(updated);
  await transactionDone(transaction);
  db.close();
  return updated;
}

export async function updateItems(ids: string[] | undefined, update: (item: RepostRecord) => Partial<RepostRecord>): Promise<void> {
  const allowed = ids ? new Set(ids) : null;
  const db = await database();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const cursor = store.openCursor();
  cursor.onsuccess = () => {
    const entry = cursor.result;
    if (!entry) return;
    const item = entry.value as RepostRecord;
    if (!allowed || allowed.has(item.id)) entry.update({ ...item, ...update(item), updatedAt: Date.now() });
    entry.continue();
  };
  await transactionDone(transaction);
  db.close();
}

export async function nextPendingItem(): Promise<RepostRecord | null> {
  const db = await database();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const cursor = transaction.objectStore(STORE_NAME).openCursor();
  const found: RepostRecord[] = [];
  cursor.onsuccess = () => {
    const entry = cursor.result;
    if (!entry || found.length) return;
    const item = entry.value as RepostRecord;
    if (item.selected && item.status === 'pending') { found.push(item); return; }
    entry.continue();
  };
  await transactionDone(transaction);
  db.close();
  return found[0] ? updateItem(found[0].id, { status: 'removing' }) : null;
}

export async function counts(): Promise<Pick<RunState, 'collected' | 'selected' | 'removed' | 'failed' | 'remaining'>> {
  const db = await database();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const cursor = transaction.objectStore(STORE_NAME).openCursor();
  const totals = { collected: 0, selected: 0, removed: 0, failed: 0, remaining: 0 };
  cursor.onsuccess = () => {
    const entry = cursor.result;
    if (!entry) return;
    const { selected, status } = entry.value as RepostRecord;
    totals.collected += 1;
    if (selected) totals.selected += 1;
    if (status === 'removed') totals.removed += 1;
    if (status === 'failed') totals.failed += 1;
    if (selected && status !== 'removed') totals.remaining += 1;
    entry.continue();
  };
  await transactionDone(transaction);
  db.close();
  return totals;
}

export async function verificationPageLimit(fallback: number): Promise<number> {
  const db = await database();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const cursor = transaction.objectStore(STORE_NAME).openCursor();
  let maxPage = 1;
  cursor.onsuccess = () => {
    const entry = cursor.result;
    if (!entry) return;
    const item = entry.value as RepostRecord;
    if (item.selected) maxPage = Math.max(maxPage, item.scanPage ?? fallback);
    entry.continue();
  };
  await transactionDone(transaction);
  db.close();
  return maxPage;
}
