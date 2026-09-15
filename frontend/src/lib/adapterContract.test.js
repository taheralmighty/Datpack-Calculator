import { getDefaultState } from './calc';

describe.each(['local', 'cloud'])('%s adapter contract', mode => {
  let adapter;
  let rows;
  beforeEach(() => {
    jest.resetModules(); localStorage.clear();
    Object.defineProperty(global, 'crypto', { configurable: true, value: { randomUUID: () => '00000000-0000-4000-8000-000000000099' } });
    rows = [{ id: 'quote', client_id: 'client', state: getDefaultState(), revision: 1, updated_at: '2026-09-14T00:00:00.000Z' }];
    const supabase = {
      from: jest.fn(table => {
        const filters = [];
        let inserted, changes;
        const execute = () => {
          if (table === 'clients') return { data: [{ id: 'client', name: 'Test', quotations: [{ count: rows.filter(row => !row.state._deletedAt).length }] }] };
          if (inserted) {
            if (rows.some(row => row.id === inserted.id)) return { error: { code: '23505' } };
            rows.push(inserted);
            return { data: [inserted] };
          }
          const matched = rows.filter(row => filters.every(filter => filter(row)));
          if (changes) matched.forEach(row => Object.assign(row, changes));
          return { data: matched };
        };
        const chain = {};
        for (const method of ['select', 'order', 'limit']) chain[method] = jest.fn(() => chain);
        chain.eq = (key, value) => { filters.push(row => row[key] === value); return chain; };
        chain.is = (key) => {
          expect(key).toMatch(/state->>_deletedAt$/);
          filters.push(row => !row.state._deletedAt); return chain;
        };
        chain.insert = payload => { inserted = payload; return chain; };
        chain.update = payload => { changes = payload; return chain; };
        chain.then = resolve => Promise.resolve(execute()).then(resolve);
        chain.maybeSingle = () => { const result = execute(); return Promise.resolve({ ...result, data: result.data?.[0] || null }); };
        chain.single = chain.maybeSingle;
        return chain;
      }),
    };
    jest.doMock('./supabase', () => ({ hasSupabase: mode === 'cloud', supabase }));
    if (mode === 'local') {
      localStorage.setItem('datpack_clients', JSON.stringify([{ id: 'client', name: 'Test' }]));
      localStorage.setItem('datpack_quotations', JSON.stringify(rows));
    }
    adapter = mode === 'local' ? require('./db.local') : require('./db');
  });
  test('counts, history, latest and checked save use the same normalized shape', async () => {
    expect((await adapter.getClients())[0].quotationCount).toBe(1);
    expect((await adapter.getQuotationsByClient('client'))[0].client_id).toBe('client');
    expect((await adapter.getLatestQuotation('client')).id).toBe('quote');
    const expected = mode === 'cloud' ? rows[0].updated_at : 1;
    const saved = await adapter.saveQuotation({ id: 'quote', client_id: 'client', quote_number: 'QT-TEST', version: 1, state: getDefaultState(), expected_revision: expected });
    expect(saved.revision).toBe(mode === 'cloud' ? saved.updated_at : 2);
    expect(saved.revision).not.toBe(expected);
    expect(saved.state.pricingModelVersion).toBe(2);
    expect(await adapter.deleteQuotation('quote')).toEqual({ success: true });
    expect(await adapter.getQuotationsByClient('client')).toEqual([]);
    expect((await adapter.getClients())[0].quotationCount).toBe(0);
  });

  test('stale saves and deleted identities cannot overwrite or resurrect records', async () => {
    const original = await adapter.getQuotation('quote');
    const payload = { id: 'quote', client_id: 'client', state: getDefaultState(), expected_revision: original.revision };
    const saved = await adapter.saveQuotation(payload);
    await expect(adapter.saveQuotation({ ...payload, state: { ...getDefaultState(), jobName: 'Stale different edit' } })).rejects.toThrow(/changed elsewhere/);
    expect(saved.state.pricingModelVersion).toBe(2);
    await adapter.deleteQuotation('quote');
    await expect(adapter.saveQuotation({ ...payload, expected_revision: 0 })).rejects.toThrow(/changed elsewhere/);
    expect(await adapter.getQuotationsByClient('client')).toEqual([]);
  });

  test('deleting before first save retains a marker that blocks a late insert', async () => {
    await adapter.deleteQuotation('never-saved');
    await expect(adapter.saveQuotation({ id: 'never-saved', client_id: 'client', state: getDefaultState(), expected_revision: 0 })).rejects.toThrow(/changed elsewhere/);
  });
  test('invalid monetary values cannot bypass store validation through the adapter', async () => {
    await expect(adapter.saveQuotation({ id: 'quote', client_id: 'client', state: { ...getDefaultState(), overrides: { totalPaperCost: -100 } }, expected_revision: 1 }))
      .rejects.toThrow(/nonnegative/);
  });
});

test('missing Supabase configuration never reads or writes a permanent local database', async () => {
  jest.resetModules();
  jest.doMock('./supabase', () => ({ supabase: null }));
  const adapter = require('./db');
  localStorage.setItem('datpack_clients', '[{"id":"old-local","name":"Not authoritative"}]');
  const before = localStorage.getItem('datpack_clients');
  await expect(adapter.getClients()).rejects.toThrow(/not configured/);
  await expect(adapter.saveQuotation({ state: getDefaultState(), expected_revision: 0 })).rejects.toThrow(/not configured/);
  expect(localStorage.getItem('datpack_clients')).toBe(before);
});