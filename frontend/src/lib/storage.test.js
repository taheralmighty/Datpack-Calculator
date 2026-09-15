import { readJSON, writeJSON, isRecordArray, StorageError } from './storage';
import { createClient_, saveQuotation } from './db.local';

beforeEach(() => localStorage.clear());
afterEach(() => jest.restoreAllMocks());

test.each(['{broken', '{}', 'null', '[null]', '[{"name":"no identity"}]'])('invalid storage %s is preserved on attempted writes', async raw => {
  localStorage.setItem('datpack_clients', raw);
  localStorage.setItem('datpack_quotations', raw);
  await expect(saveQuotation({ id: 'quote', state: {} })).rejects.toBeInstanceOf(StorageError);
  expect(() => readJSON('datpack_clients', [], isRecordArray)).toThrow(StorageError);
  expect(localStorage.getItem('datpack_clients')).toBe(raw);
  expect(localStorage.getItem('datpack_quotations')).toBe(raw);
});

test('missing and valid data are distinct from read failure', () => {
  expect(readJSON('missing', [], isRecordArray)).toEqual([]);
  writeJSON('records', [{ id: 'one' }]);
  expect(readJSON('records', [], isRecordArray)).toEqual([{ id: 'one' }]);
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError'); });
  expect(() => readJSON('records', [], isRecordArray)).toThrow(/unavailable/);
});

test('quota failure preserves the previous raw value and surfaces an actionable error', () => {
  writeJSON('records', [{ id: 'one' }]);
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
  expect(() => writeJSON('records', [{ id: 'two' }])).toThrow(/available space/);
  expect(readJSON('records', [], isRecordArray)).toEqual([{ id: 'one' }]);
});

test('restoring valid data allows a retry without deleting the original on failure', async () => {
  Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => 'new-client' } });
  localStorage.setItem('datpack_clients', '{broken');
  await expect(createClient_({ name: 'Test' })).rejects.toThrow(StorageError);
  expect(localStorage.getItem('datpack_clients')).toBe('{broken');
  localStorage.setItem('datpack_clients', '[{"id":"old-client","name":"Existing"}]');
  await createClient_({ name: 'Test' });
  expect(readJSON('datpack_clients', [], isRecordArray)).toHaveLength(2);
});