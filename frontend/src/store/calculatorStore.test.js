import useCalculatorStore from './calculatorStore';
import useClientStore from './clientStore';
import * as db from '../lib/db.local';

jest.mock('../lib/db', () => {
  const fixture = jest.requireActual('../lib/db.local');
  return { ...fixture, createClient: fixture.createClient_ };
});

beforeEach(() => {
  useCalculatorStore.getState().resetCalculator();
  localStorage.clear();
  let nextId = 0;
  Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => `test-${++nextId}` } });
});

test('override edit/reset, zero override and fresh quote state', () => {
  const store = useCalculatorStore.getState();
  store.setField('orderQty', 1000);
  store.setField('upsPerSheet', 4);
  store.setField('machineSize', 'size3');
  store.setOverride('grossSheets', 3201);
  expect(store.getCalc().numberOfThousands).toBe(4);
  store.setOverride('totalPrintCost', 0);
  expect(store.getCalc().totalPrintCost).toBe(0);
  store.clearOverride('totalPrintCost');
  expect(store.getCalc().totalPrintCost).toBe(15200);
  store.clearOverride('grossSheets');
  expect(store.getCalc().grossSheets).toBe(263);
  store.resetCalculator();
  expect(store.getSerializable().overrides).toEqual({});
  expect(store.getSerializable().legacyState).toBeNull();
  expect(store.getSerializable().machineSize).toBe('');
});

test('master sheet edits auto-select the smallest fitting machine and drive printing and punching', () => {
  const store = useCalculatorStore.getState();
  store.setField('orderQty', 1000);
  store.setField('upsPerSheet', 4);
  store.setField('masterLength', '18');
  expect(useCalculatorStore.getState().machineSize).toBe('');
  for (const [length, width, machine, plate, punch] of [
    ['18', '25', 'size1', 1200, 1500], ['20', '28', 'size2', 1500, 2000], ['25', '36', 'size3', 2400, 2500], ['28', '40', 'size4', 3000, 3000],
  ]) {
    store.setField('masterLength', length);
    store.setField('masterWidth', width);
    expect(useCalculatorStore.getState().machineSize).toBe(machine);
    expect(store.getCalc().plateCost).toBe(plate);
    expect(store.getCalc().punchCost).toBe(punch);
  }
  store.setField('machineSize', 'size2');
  expect(useCalculatorStore.getState().machineSize).toBe('size2');
  store.setField('gsm', '300');
  expect(useCalculatorStore.getState().machineSize).toBe('size2');
  store.setField('masterWidth', '41');
  expect(useCalculatorStore.getState().machineSize).toBe('');
  expect([store.getCalc().totalPrintCost, store.getCalc().totalDieCuttingCost]).toEqual([0, 0]);
  store.setField('masterWidth', '');
  expect(useCalculatorStore.getState().machineSize).toBe('');
  store.loadState({ pricingModelVersion: 2, masterLength: 20, masterWidth: 28, machineSize: 'size4' });
  expect(useCalculatorStore.getState().machineSize).toBe('size4');
});

test('history uses migration and cannot inherit selections from the previous quote', () => {
  useCalculatorStore.getState().setField('machineSize', 'size4');
  useClientStore.getState().loadQuotation({ id: 'old', state: { orderQty: 500, overrides: { upsPerSheet: 2, totalWeight: 12 }, margin: 20 } });
  const state = useCalculatorStore.getState().getSerializable();
  expect(state.upsPerSheet).toBe(2);
  expect(state.machineSize).toBe('');
  expect(state.margin).toBe(0.2);
  expect(state.overrides.totalPaperWeight).toBe(12);
  expect(state.legacyState.orderQty).toBe(500);
  expect(useCalculatorStore.getState().isDirty).toBe(false);
});

test('save, update, load and duplicate preserve state without duplicate autosaves or repeat pricing', async () => {
  const client = await db.createClient_({ name: 'Regression Test' });
  const state = { orderQty: 500, overrides: { upsPerSheet: 2 }, isRepeatOrder: true };
  const saved = await db.saveQuotation({ client_id: client.id, state, job_name: 'Test', is_repeat_order: true });
  expect(saved.id).toBeTruthy();
  expect(saved.is_repeat_order).toBe(false);
  await db.saveQuotation({ ...saved, job_name: 'Updated' });
  expect(await db.getQuotationsByClient(client.id)).toHaveLength(1);
  const loaded = await db.getQuotation(saved.id);
  expect(loaded.state.upsPerSheet).toBe(2);
  expect(loaded.state.legacyState).toEqual(state);
  const copy = await db.duplicateQuotation(saved.id);
  expect(copy.id).not.toBe(saved.id);
  expect(copy.state.legacyState).toEqual(state);
  expect(copy.is_repeat_order).toBe(false);
  expect(await db.getQuotationsByClient(client.id)).toHaveLength(2);
});

test('switching or creating a client cannot carry the previous quotation into a new client', async () => {
  useCalculatorStore.getState().setField('machineSize', 'size4');
  useClientStore.getState().setCurrentQuotation({ id: 'previous', quote_number: 'QT-OLD' });
  useClientStore.getState().selectClient({ id: 'different', name: 'Different Client' });
  expect(useCalculatorStore.getState().machineSize).toBe('');
  expect(useCalculatorStore.getState().clientName).toBe('Different Client');
  expect(useClientStore.getState().currentQuotationId).toBeNull();
  await useClientStore.getState().createNewClient({ name: 'New Client' });
  expect(useCalculatorStore.getState().clientName).toBe('New Client');
  expect(useClientStore.getState().currentQuotationId).toBeNull();
});