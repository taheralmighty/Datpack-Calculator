import * as db from './db.local';
import { getDefaultState } from './calc';
import { getDrafts, storeDraft, removeDraft } from './drafts';

beforeEach(() => {
  localStorage.clear();
  let identity = 0;
  Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => `identity-${++identity}` } });
});

test('adapter rejects stale revisions, wrong client and deleted IDs', async () => {
  const saved = await db.saveQuotation({ id: 'one', client_id: 'client', quote_number: 'QT-ONE', state: getDefaultState(), expected_revision: 0 });
  expect(saved.revision).toBe(1);
  await expect(db.saveQuotation({ ...saved, expected_revision: 0 })).rejects.toThrow(/changed elsewhere/);
  await expect(db.saveQuotation({ ...saved, client_id: 'other', expected_revision: 1 })).rejects.toThrow(/changed elsewhere/);
  await db.deleteQuotation('one');
  expect(await db.getQuotation('one')).toBeNull();
  await expect(db.saveQuotation({ ...saved, expected_revision: 0 })).rejects.toThrow(/changed elsewhere/);
});

test('draft recovery preserves multiple identities and newer edits after old save completion', () => {
  const first = { id: 'one', client_id: 'client1', editRevision: 1, state: getDefaultState() };
  storeDraft(first);
  storeDraft({ ...first, id: 'two', client_id: 'client2' });
  storeDraft({ ...first, editRevision: 2 });
  removeDraft('one', 1);
  expect(getDrafts()).toHaveLength(2);
  expect(getDrafts().find(draft => draft.id === 'one').editRevision).toBe(2);
  removeDraft('one', 2);
  expect(getDrafts().map(draft => draft.client_id)).toEqual(['client2']);
});

test('counts and latest do not depend on the global 200 quotation list', async () => {
  const client = await db.createClient_({ name: 'Quiet client' });
  await db.saveQuotation({ id: 'old', client_id: client.id, state: getDefaultState(), quote_number: 'QT-OLD' });
  for (let index = 0; index < 201; index++) await db.saveQuotation({ id: `recent-${index}`, client_id: 'other', quote_number: `QT-${index}`, state: getDefaultState() });
  expect((await db.getAllQuotations())).toHaveLength(200);
  expect((await db.getLatestQuotation(client.id)).id).toBe('old');
  expect((await db.getClients())[0].quotationCount).toBe(1);
});