import useCalculatorStore from './calculatorStore';
import useClientStore from './clientStore';
import * as db from '../lib/db';
jest.mock('../lib/db', () => ({
  saveQuotation: jest.fn(), deleteQuotation: jest.fn(), getClients: jest.fn(),
  getAllQuotations: jest.fn(), getQuotationsByClient: jest.fn(),
}));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
let identity = 0;
beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear();
  Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => `race-${++identity}` } });
  db.getClients.mockResolvedValue([{ id: 'client', name: 'Client' }, { id: 'other', name: 'Other' }]);
  db.getAllQuotations.mockResolvedValue([]); db.getQuotationsByClient.mockResolvedValue([]);
  useClientStore.setState({ clients: [{ id: 'client', name: 'Client' }, { id: 'other', name: 'Other' }], pendingTransition: null, selectedClient: null });
  useClientStore.getState().selectClient({ id: 'client', name: 'Client' });
  useCalculatorStore.getState().setField('jobName', 'Initial');
});

test('save completion never marks newer edits clean', async () => {
  const pending = deferred(); db.saveQuotation.mockImplementation(payload => pending.promise.then(() => ({ ...payload, revision: 1 })));
  const saved = useClientStore.getState().saveCurrentQuotation();
  useCalculatorStore.getState().setField('jobName', 'Newer');
  pending.resolve(); await saved;
  expect(useCalculatorStore.getState().isDirty).toBe(true);
  expect(useCalculatorStore.getState().jobName).toBe('Newer');
  expect(useClientStore.getState().currentQuotation.state.jobName).toBe('Initial');
});

test.each(['client', 'quote'])('late completion cannot change a different %s session', async kind => {
  const pending = deferred(); db.saveQuotation.mockImplementation(payload => pending.promise.then(() => ({ ...payload, revision: 1 })));
  const saved = useClientStore.getState().saveCurrentQuotation();
  if (kind === 'client') useClientStore.getState().selectClient({ id: 'other', name: 'Other' });
  else useClientStore.getState().loadQuotation({ id: 'loaded-other', client_id: 'client', state: { jobName: 'Other quote' } });
  const current = useClientStore.getState().currentQuotationId;
  pending.resolve(); await saved;
  expect(useClientStore.getState().currentQuotationId).toBe(current);
  expect(useCalculatorStore.getState().isDirty).toBe(false);
});

test('reversed fetches cannot show inactive client rows', async () => {
  const first = deferred(), second = deferred();
  db.getQuotationsByClient.mockImplementation(id => id === 'client' ? first.promise : second.promise);
  const request = useClientStore.getState().fetchQuotationsByClient('client');
  useClientStore.getState().selectClient({ id: 'other', name: 'Other' });
  second.resolve([{ id: 'other-row', client_id: 'other' }]); await Promise.resolve();
  first.resolve([{ id: 'wrong-row', client_id: 'client' }]); await request;
  expect(useClientStore.getState().quotations).toEqual([{ id: 'other-row', client_id: 'other' }]);
});

test('save/discard/cancel guards all requested state replacement', async () => {
  const action = jest.fn();
  useClientStore.getState().requestTransition(action);
  expect(action).not.toHaveBeenCalled();
  await useClientStore.getState().resolveTransition('cancel');
  expect(action).not.toHaveBeenCalled();
  useClientStore.getState().requestTransition(action);
  await useClientStore.getState().resolveTransition('discard');
  expect(action).toHaveBeenCalledTimes(1);
});

test('editing an issued quote starts a separate revision without overwriting the issued record', () => {
  const state = useCalculatorStore.getState().getSerializable();
  const issued = { ...state, issuedAt: '2026-09-14T00:00:00Z', issueSnapshot: { state, calc: useCalculatorStore.getState().getCalc() } };
  useClientStore.getState().loadQuotation({ id: 'issued-record', client_id: 'client', quote_number: 'QT-ISSUED', version: 1, revision: 1, state: issued });
  useCalculatorStore.getState().setField('orderQty', 2000);
  expect(useClientStore.getState().currentQuotationId).not.toBe('issued-record');
  expect(useClientStore.getState().currentQuoteNumber).toBe('QT-ISSUED');
  expect(useClientStore.getState().currentVersion).toBe(2);
  expect(useCalculatorStore.getState().issueSnapshot).toBeNull();
});

test('save failure leaves newer work and its recovery draft available for retry', async () => {
  db.saveQuotation.mockRejectedValueOnce(new Error('Offline')).mockImplementation(payload => Promise.resolve({ ...payload, revision: 1 }));
  await expect(useClientStore.getState().saveCurrentQuotation()).rejects.toThrow('Offline');
  expect(useCalculatorStore.getState().isDirty).toBe(true);
  expect(useClientStore.getState().saveError).toBe('Connection unavailable - changes saved on this device and will retry. Offline');
  expect(useClientStore.getState().saveRetryable).toBe(true);
  expect(JSON.parse(localStorage.getItem('datpack_recovery_drafts'))).toHaveLength(1);
  await useClientStore.getState().saveCurrentQuotation();
  expect(useCalculatorStore.getState().isDirty).toBe(false);
  expect(JSON.parse(localStorage.getItem('datpack_recovery_drafts'))).toHaveLength(0);
});

test('older completion cannot clear a newer queued save status', async () => {
  const first = deferred(), second = deferred();
  db.saveQuotation.mockImplementationOnce(payload => first.promise.then(() => ({ ...payload, revision: 1 })))
    .mockImplementationOnce(payload => second.promise.then(() => ({ ...payload, revision: 2 })));
  const firstSave = useClientStore.getState().saveCurrentQuotation();
  useCalculatorStore.getState().setField('jobName', 'Queued revision');
  const secondSave = useClientStore.getState().saveCurrentQuotation();
  first.resolve(); await firstSave;
  expect(useClientStore.getState().isSaving).toBe(true);
  expect(useCalculatorStore.getState().isDirty).toBe(true);
  second.resolve(); await secondSave;
  expect(useClientStore.getState().isSaving).toBe(false);
  expect(useCalculatorStore.getState().isDirty).toBe(false);
});

test('edits before the first issue save resolves fork immediately, even with reversed completion', async () => {
  const pending = deferred();
  db.saveQuotation.mockImplementationOnce(payload => pending.promise.then(() => ({ ...payload, revision: 1 })))
    .mockImplementation(payload => Promise.resolve({ ...payload, revision: 1 }));
  const state = useCalculatorStore.getState().getSerializable();
  useCalculatorStore.getState().setField('issueSnapshot', { state, calc: useCalculatorStore.getState().getCalc() });
  const issueSave = useClientStore.getState().saveCurrentQuotation();
  const originalId = useClientStore.getState().currentQuotationId;
  useCalculatorStore.getState().setField('orderQty', 6000);
  const nextId = useClientStore.getState().currentQuotationId;
  expect(nextId).not.toBe(originalId);
  expect(useClientStore.getState().currentVersion).toBe(2);
  await useClientStore.getState().saveCurrentQuotation();
  pending.resolve();
  const issued = await issueSave;
  expect(issued.id).toBe(originalId);
  expect(issued.state.issueSnapshot).toBeTruthy();
  expect(useClientStore.getState().currentQuotationId).toBe(nextId);
  expect(useClientStore.getState().currentQuotation.state.orderQty).toBe(6000);
  expect(useCalculatorStore.getState().isDirty).toBe(false);
});