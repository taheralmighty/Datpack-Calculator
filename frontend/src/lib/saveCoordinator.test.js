import { createSaveCoordinator } from './saveCoordinator';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const snapshot = (editRevision = 1, fields = {}) => ({
  id: 'quote', client_id: 'client', sessionId: 'session', editRevision,
  expectedRevision: 0, quote_number: 'QT-TEST', state: { jobName: `Revision ${editRevision}` }, ...fields,
});

test('two first saves and autosave/export of the same revision share one immutable write', async () => {
  const pending = deferred();
  const adapter = { saveQuotation: jest.fn(() => pending.promise) };
  const queue = createSaveCoordinator(adapter);
  const state = snapshot();
  const first = queue.save(state);
  const second = queue.save(state);
  state.state.jobName = 'later edit';
  await Promise.resolve();
  pending.resolve({ id: 'quote', revision: 1 });
  expect(await first).toEqual(await second);
  expect(adapter.saveQuotation).toHaveBeenCalledTimes(1);
  expect(adapter.saveQuotation.mock.calls[0][0].state.jobName).toBe('Revision 1');
});

test('writes for a quotation are serialized with the preceding server revision', async () => {
  const pending = deferred();
  const adapter = { saveQuotation: jest.fn().mockImplementationOnce(() => pending.promise).mockResolvedValue({ revision: 2 }) };
  const queue = createSaveCoordinator(adapter);
  const first = queue.save(snapshot());
  const second = queue.save(snapshot(2));
  await Promise.resolve();
  await Promise.resolve();
  expect(adapter.saveQuotation).toHaveBeenCalledTimes(1);
  pending.resolve({ revision: 1 });
  await first;
  await second;
  expect(adapter.saveQuotation.mock.calls[1][0].expected_revision).toBe(1);
});

test('failed writes can retry without poisoning the queue', async () => {
  const adapter = { saveQuotation: jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ revision: 1 }) };
  const queue = createSaveCoordinator(adapter);
  await expect(queue.save(snapshot())).rejects.toThrow('offline');
  await expect(queue.save(snapshot())).resolves.toEqual({ revision: 1 });
});

test('independent quote sessions do not share a concurrency revision', async () => {
  const adapter = { saveQuotation: jest.fn(payload => Promise.resolve({ revision: payload.expected_revision + 1 })) };
  const queue = createSaveCoordinator(adapter);
  await queue.save(snapshot());
  await queue.save(snapshot(1, { sessionId: 'other-editor', expectedRevision: 0 }));
  expect(adapter.saveQuotation.mock.calls[1][0].expected_revision).toBe(0);
});

test('delete retires queued writes and runs after the in-flight write, never before it', async () => {
  const pending = deferred();
  const adapter = { saveQuotation: jest.fn(() => pending.promise), deleteQuotation: jest.fn().mockResolvedValue({ success: true }) };
  const queue = createSaveCoordinator(adapter);
  const first = queue.save(snapshot());
  await Promise.resolve();
  await Promise.resolve();
  const second = queue.save(snapshot(2));
  const rejected = second.catch(error => error);
  const deleted = queue.remove('quote');
  expect(adapter.deleteQuotation).not.toHaveBeenCalled();
  pending.resolve({ revision: 1 });
  await first;
  expect((await rejected).message).toContain('deleted');
  await deleted;
  expect(adapter.saveQuotation).toHaveBeenCalledTimes(1);
  expect(adapter.deleteQuotation).toHaveBeenCalledTimes(1);
  await expect(queue.save(snapshot(3))).rejects.toThrow('deleted');
});

test('replaying an older snapshot after a newer revision cannot overwrite it', async () => {
  const adapter = { saveQuotation: jest.fn(payload => Promise.resolve({ revision: payload.expected_revision + 1 })) };
  const queue = createSaveCoordinator(adapter);
  await queue.save(snapshot());
  await queue.save(snapshot(2));
  await expect(queue.save(snapshot())).rejects.toThrow(/newer draft revision/);
  expect(adapter.saveQuotation).toHaveBeenCalledTimes(2);
});

test('an uncertain old request is confirmed before newer edits, including after restart', async () => {
  const pendingWrite = { payload: { ...snapshot().state, id: 'quote', client_id: 'client', state: snapshot().state, expected_revision: 0 }, editRevision: 1 };
  const adapter = { saveQuotation: jest.fn().mockResolvedValueOnce({ revision: 'confirmed' }).mockResolvedValueOnce({ revision: 'newer' }) };
  const queue = createSaveCoordinator(adapter);
  await queue.save(snapshot(2, { pendingWrite }));
  expect(adapter.saveQuotation.mock.calls[0][0]).toEqual(pendingWrite.payload);
  expect(adapter.saveQuotation.mock.calls[1][0].expected_revision).toBe('confirmed');
  expect(adapter.saveQuotation.mock.calls[1][0].state.jobName).toBe('Revision 2');
});