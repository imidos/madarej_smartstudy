import { Service } from '@angular/core';
import { FeasibilityStudyDraft, newStudy } from './study-model';

function matchesShape(value: unknown, sample: unknown): boolean {
  if (typeof sample === 'string') return typeof value === 'string' && value.length <= 4000;
  if (typeof sample === 'boolean') return typeof value === 'boolean';
  if (Array.isArray(sample))
    return (
      Array.isArray(value) &&
      value.every((item) => matchesShape(item, sample[0])) &&
      new Set(value.map((item) => (item as { id: string }).id)).size === value.length
    );
  if (sample && typeof sample === 'object')
    return (
      !!value &&
      typeof value === 'object' &&
      Object.entries(sample).every(([key, field]) =>
        matchesShape((value as Record<string, unknown>)[key], field),
      )
    );
  return false;
}
export function isDraft(value: unknown): value is FeasibilityStudyDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Record<string, unknown>;
  if (
    draft['version'] !== 1 ||
    typeof draft['id'] !== 'string' ||
    typeof draft['completed'] !== 'boolean' ||
    !Number.isInteger(draft['step']) ||
    Number(draft['step']) < 0 ||
    Number(draft['step']) > 8 ||
    typeof draft['createdAt'] !== 'string' ||
    !Number.isFinite(Date.parse(draft['createdAt'])) ||
    typeof draft['updatedAt'] !== 'string' ||
    !Number.isFinite(Date.parse(draft['updatedAt'])) ||
    !matchesShape(draft['data'], newStudy())
  )
    return false;
  const logo = draft['logo'];
  if (logo !== undefined) {
    if (!logo || typeof logo !== 'object') return false;
    const item = logo as Record<string, unknown>;
    if (
      !(item['blob'] instanceof Blob) ||
      typeof item['name'] !== 'string' ||
      item['name'].length > 255 ||
      !['image/png', 'image/jpeg', 'image/webp'].includes(String(item['type'])) ||
      item['blob'].size > 2 * 1024 * 1024 ||
      item['size'] !== item['blob'].size ||
      item['type'] !== item['blob'].type
    )
      return false;
  }
  return true;
}

@Service()
export class DraftRepository {
  private async database(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      let blocked = false;
      const request = indexedDB.open('madarej-feasibility', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('drafts');
      request.onsuccess = () => {
        if (blocked) request.result.close();
        else resolve(request.result);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        blocked = true;
        reject(new Error('database-blocked'));
      };
    });
  }
  private async transaction<T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const database = await this.database();
    try {
      return await new Promise<T>((resolve, reject) => {
        const transaction = database.transaction('drafts', mode);
        const request = operation(transaction.objectStore('drafts'));
        transaction.oncomplete = () => resolve(request.result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error ?? new Error('transaction-aborted'));
      });
    } finally {
      database.close();
    }
  }
  async load(): Promise<FeasibilityStudyDraft | undefined> {
    const result: unknown = await this.transaction('readonly', (store) => store.get('active'));
    if (result === undefined) return undefined;
    if (!isDraft(result)) throw new Error('invalid-draft');
    return result;
  }
  async save(draft: FeasibilityStudyDraft): Promise<void> {
    if (!isDraft(draft)) throw new Error('invalid-draft');
    await this.transaction('readwrite', (store) => store.put(draft, 'active'));
  }
  async delete(): Promise<void> {
    await this.transaction('readwrite', (store) => store.delete('active'));
  }
}
