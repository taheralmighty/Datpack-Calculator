import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import App from './App';
import useClientStore from './store/clientStore';
import useCalculatorStore from './store/calculatorStore';
import { getDefaultState } from './lib/calc';
import * as db from './lib/db';
import { generatePDF } from './lib/pdf';

jest.mock('./lib/db', () => ({ saveQuotation: jest.fn(), getClients: jest.fn(), getAllQuotations: jest.fn(), getQuotationsByClient: jest.fn() }));
jest.mock('./lib/pdf', () => ({ generatePDF: jest.fn() }));
jest.mock('./components/cursor/CustomCursor', () => () => null);
let container, root;
let id = 0;
beforeEach(async () => {
  jest.useFakeTimers(); jest.clearAllMocks(); localStorage.clear();
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = jest.fn(() => ({ matches: true, addListener: jest.fn(), removeListener: jest.fn() }));
  global.IntersectionObserver = class { observe() {} disconnect() {} };
  Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => `app-${++id}` } });
  const client = { id: 'app-client', name: 'App client' };
  db.getClients.mockResolvedValue([client]); db.getAllQuotations.mockResolvedValue([]); db.getQuotationsByClient.mockResolvedValue([]);
  useClientStore.setState({ selectedClient: client, clients: [client], isClientModalOpen: false, isHistoryOpen: false, pendingTransition: null, exportBusy: false, actionError: null, recoveryError: null });
  useClientStore.getState().setCurrentQuotation(null);
  useCalculatorStore.getState().loadState({ ...getDefaultState(), jobName: 'App quote', orderQty: 1000, upsPerSheet: 4, masterLength: 20, masterWidth: 28, gsm: 300, paperRate: 120 });
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  await act(async () => root.render(<App />));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); jest.useRealTimers(); });

test('actual App autosave keeps newer edits dirty and persists the next revision', async () => {
  let complete;
  db.saveQuotation.mockImplementationOnce(payload => new Promise(resolve => { complete = () => resolve({ ...payload, revision: 1 }); }))
    .mockImplementation(payload => Promise.resolve({ ...payload, revision: 2 }));
  await act(async () => Simulate.change(container.querySelector('[data-testid="job-name-input"]'), { target: { value: 'First' } }));
  await act(async () => jest.advanceTimersByTime(3000));
  expect(db.saveQuotation).toHaveBeenCalledTimes(1);
  await act(async () => Simulate.change(container.querySelector('[data-testid="job-name-input"]'), { target: { value: 'Second' } }));
  await act(async () => complete());
  expect(useCalculatorStore.getState().isDirty).toBe(true);
  expect(container.querySelector('[data-testid="save-indicator"]').textContent).toContain('Unsaved');
  await act(async () => jest.advanceTimersByTime(3000));
  expect(db.saveQuotation.mock.calls[1][0].state.jobName).toBe('Second');
  expect(db.saveQuotation.mock.calls[1][0].expected_revision).toBe(1);
  expect(useCalculatorStore.getState().isDirty).toBe(false);
});

test('actual export and autosave use one identity and the same captured state', async () => {
  db.saveQuotation.mockImplementation(payload => Promise.resolve({ ...payload, revision: 1 }));
  generatePDF.mockResolvedValue();
  await act(async () => Simulate.click(container.querySelector('[data-testid="export-pdf-btn"]')));
  expect(generatePDF).toHaveBeenCalledTimes(1);
  const saved = db.saveQuotation.mock.calls[0][0];
  expect(generatePDF.mock.calls[0][0]).toEqual(saved.state);
  expect(generatePDF.mock.calls[0][0]._quoteNumber).toBe(saved.quote_number);
  await act(async () => jest.advanceTimersByTime(3000));
  expect(db.saveQuotation).toHaveBeenCalledTimes(1);
  await act(async () => Simulate.click(container.querySelector('[data-testid="export-pdf-btn"]')));
  expect(generatePDF).toHaveBeenCalledTimes(2);
  expect(db.saveQuotation).toHaveBeenCalledTimes(1);
});

test('New Quote cannot replace dirty state before Save/Discard/Cancel', async () => {
  await act(async () => Simulate.change(container.querySelector('[data-testid="job-name-input"]'), { target: { value: 'Unsaved' } }));
  await act(async () => Simulate.click(container.querySelector('[data-testid="new-quote-btn"]')));
  expect(document.querySelector('[role="dialog"]').getAttribute('aria-label')).toBe('Unsaved quotation');
  expect(useCalculatorStore.getState().jobName).toBe('Unsaved');
  await act(async () => Simulate.click(document.querySelector('[data-testid="confirm-no"]')));
  expect(useCalculatorStore.getState().jobName).toBe('Unsaved');
});

test('a database error has only the active dialog alert, not an overlapping background copy', async () => {
  await act(async () => useClientStore.setState({ isClientModalOpen: true, actionError: 'column quotations_1.deleted_at does not exist' }));
  const alerts = document.querySelectorAll('[role="alert"]');
  expect(alerts).toHaveLength(1);
  expect(alerts[0].closest('[role="dialog"]')).not.toBeNull();
  expect(alerts[0].textContent).toContain('column quotations_1.deleted_at does not exist');
});

test('one application flow never offers or labels local/cloud persistence modes', async () => {
  await act(async () => useClientStore.setState({ isClientModalOpen: true }));
  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog.textContent).not.toMatch(/local storage mode|cloud mode|offline mode/i);
});

test('failed client loading is not represented as an empty database and retry restores the list', async () => {
  db.getClients.mockRejectedValueOnce(new Error('column quotations_1.deleted_at does not exist'));
  await act(async () => useClientStore.setState({ clients: [], allQuotations: [], isClientModalOpen: true }));
  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog.textContent).toContain('Clients could not be loaded');
  expect(dialog.textContent).toContain('Recent quotations could not be loaded');
  expect(dialog.textContent).not.toContain('No clients yet');
  expect(dialog.textContent).not.toContain('No recent quotations');
  await act(async () => Simulate.click([...dialog.querySelectorAll('button')].find(button => button.textContent === 'Reload Clients')));
  expect(dialog.textContent).toContain('App client');
  expect(dialog.textContent).not.toContain('Clients could not be loaded');
  expect(useClientStore.getState().clientsLoadError).toBeNull();
});

test('a quotation fetch error keeps clients usable without claiming there are no recent quotations', async () => {
  db.getAllQuotations.mockRejectedValueOnce(new Error('Quotation request failed'));
  await act(async () => useClientStore.setState({ allQuotations: [], isClientModalOpen: true }));
  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog.textContent).toContain('App client');
  expect(dialog.textContent).toContain('Recent quotations could not be loaded');
  expect(dialog.textContent).not.toContain('No recent quotations');
});

test('temporary save failure retries automatically and does not claim Saved until Supabase confirms', async () => {
  db.saveQuotation.mockRejectedValueOnce(Object.assign(new Error('Failed to fetch'), { retryable: true }))
    .mockImplementation(payload => Promise.resolve({ ...payload, revision: '2026-09-15T00:00:00Z', updated_at: '2026-09-15T00:00:00Z' }));
  await act(async () => Simulate.change(container.querySelector('[data-testid="job-name-input"]'), { target: { value: 'Protected draft' } }));
  await act(async () => jest.advanceTimersByTime(3000));
  expect(container.querySelector('[data-testid="save-indicator"]').textContent).toContain('Waiting to retry');
  const draft = JSON.parse(localStorage.getItem('datpack_recovery_drafts'))[0];
  expect(draft.state.jobName).toBe('Protected draft');
  expect(draft.pendingWrite.payload.id).toBe(draft.id);
  expect(localStorage.getItem('datpack_quotations')).toBeNull();
  await act(async () => jest.advanceTimersByTime(15000));
  expect(container.querySelector('[data-testid="save-indicator"]').textContent).toContain('Saved');
  expect(db.saveQuotation.mock.calls[1][0].id).toBe(draft.id);
  expect(JSON.parse(localStorage.getItem('datpack_recovery_drafts'))).toHaveLength(0);
});

test('online signal retries a pending save but a conflict is never automatically retried', async () => {
  db.saveQuotation.mockRejectedValueOnce(Object.assign(new Error('Offline'), { retryable: true }))
    .mockRejectedValue(new Error('Quotation changed elsewhere'));
  await act(async () => Simulate.change(container.querySelector('[data-testid="job-name-input"]'), { target: { value: 'Offline change' } }));
  await act(async () => jest.advanceTimersByTime(3000));
  await act(async () => window.dispatchEvent(new Event('online')));
  expect(db.saveQuotation).toHaveBeenCalledTimes(2);
  expect(useClientStore.getState().saveRetryable).toBe(false);
  await act(async () => jest.advanceTimersByTime(60000));
  expect(db.saveQuotation).toHaveBeenCalledTimes(2);
  expect(useCalculatorStore.getState().isDirty).toBe(true);
});

test('refresh-style initialization exposes recovery even when client fetch fails', async () => {
  await act(async () => Simulate.change(container.querySelector('[data-testid="job-name-input"]'), { target: { value: 'Recover while offline' } }));
  const draft = JSON.parse(localStorage.getItem('datpack_recovery_drafts'))[0];
  await act(async () => useClientStore.getState().setCurrentQuotation(null));
  db.getClients.mockRejectedValue(Object.assign(new Error('Failed to fetch'), { retryable: true }));
  await act(async () => useClientStore.setState({ selectedClient: null, clients: [], recoveryDrafts: [], isClientModalOpen: true }));
  expect(document.querySelector('[role="dialog"]').textContent).toContain('Recover while offline');
  await act(async () => useClientStore.getState().recoverDraft(draft));
  expect(useClientStore.getState().currentQuotationId).toBe(draft.id);
  expect(useClientStore.getState().selectedClient.id).toBe(draft.client_id);
  expect(useCalculatorStore.getState().jobName).toBe('Recover while offline');
  expect(useCalculatorStore.getState().isDirty).toBe(true);
});