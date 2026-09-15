import { supabase } from './supabase';
import { migrateState, generateQuoteNumber } from './calc';
import { validateQuote } from './validation';
import { QuoteConflictError } from './saveCoordinator';
import { persistenceError, isTemporaryConnectionError } from './persistenceErrors';

const connection = () => {
  if (!supabase) throw new Error('Supabase connection is not configured. Your recovery drafts remain on this device; contact the application maintainer.');
  return supabase;
};

const normalizeQuote = quote => quote ? { ...quote, revision: quote.updated_at } : null;
const nextTimestamp = previous => new Date(Math.max(Date.now(), (Date.parse(previous) || 0) + 1)).toISOString();
const checkError = (error, status) => {
  if (error?.code === '40001' || error?.code === '23505') throw new QuoteConflictError();
  if (error) throw persistenceError(error, status);
};

const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const sameContent = (saved, payload) => saved && !saved.state?._deletedAt &&
  ['id', 'client_id', 'job_name', 'quote_number', 'version'].every(key => saved[key] === payload[key]) &&
  JSON.stringify(canonical(saved.state)) === JSON.stringify(canonical(payload.state));

// Re-export createClient_ as createClient for consistency
export const createClient_ = async (data) => {
  const { data: client, error, status } = await connection()
    .from('clients')
    .insert([{ name: data.name, phone: data.phone || '', email: data.email || '' }])
    .select()
    .single();
  checkError(error, status);
  return client;
};

export const getClients = async () => {
  const { data, error, status } = await connection()
    .from('clients')
    .select('*, quotations(count)')
    .is('quotations.state->>_deletedAt', null)
    .order('created_at', { ascending: false });
  checkError(error, status);
  return (data || []).map(client => ({ ...client, quotationCount: client.quotations?.[0]?.count || 0 }));
};

export const getQuotationsByClient = async (clientId) => {
  const { data, error, status } = await connection()
    .from('quotations')
    .select('*')
    .eq('client_id', clientId)
    .is('state->>_deletedAt', null)
    .order('updated_at', { ascending: false });
  checkError(error, status);
  return (data || []).map(normalizeQuote);
};

export const getQuotation = async (id) => {
  const { data, error, status } = await connection()
    .from('quotations')
    .select('*')
    .eq('id', id)
    .is('state->>_deletedAt', null)
    .single();
  checkError(error, status);
  return normalizeQuote(data);
};

export const saveQuotation = async (data) => {
  const state = migrateState(data.state);
  const validation = validateQuote(state);
  if (validation.status === 'invalid') throw new Error(validation.messages.join(' '));
  const expected = data.expected_revision ?? data.revision ?? 0;
  if (expected !== 0 && (typeof expected !== 'string' || !Number.isFinite(Date.parse(expected)))) {
    throw new QuoteConflictError('Reload this quotation before saving. Its saved version token is from an older adapter.');
  }
  const payload = {
    id: data.id || crypto.randomUUID(),
    client_id: data.client_id,
    job_name: data.job_name || 'Untitled',
    quote_number: data.quote_number,
    version: data.version || 1,
    is_repeat_order: false,
    state,
    updated_at: nextTimestamp(expected),
  };
  let request;
  if (expected === 0) {
    request = connection().from('quotations').insert(payload);
  } else {
    if (!data.id) throw new QuoteConflictError();
    const { id, client_id, quote_number, version, ...changes } = payload;
    request = connection().from('quotations').update(changes).eq('id', id).eq('client_id', client_id)
      .eq('updated_at', expected).is('state->>_deletedAt', null);
  }
  const { data: saved, error, status } = await request.select('*').maybeSingle();
  if (!saved && (!error || error.code === '23505' || isTemporaryConnectionError(error, status))) {
    const confirmed = await connection().from('quotations').select('*').eq('id', payload.id).maybeSingle();
    if (!confirmed.error && sameContent(confirmed.data, payload)) return normalizeQuote(confirmed.data);
    if (confirmed.error && !error) checkError(confirmed.error, confirmed.status);
  }
  checkError(error, status);
  if (!saved) throw new QuoteConflictError();
  return normalizeQuote(saved);
};

export const deleteQuotation = async (id) => {
  const { data: current, error: readError, status: readStatus } = await connection().from('quotations').select('*').eq('id', id).maybeSingle();
  checkError(readError, readStatus);
  if (current?.state?._deletedAt) return { success: true };
  const timestamp = nextTimestamp(current?.updated_at);
  const changes = { state: { ...current?.state, _deletedAt: timestamp }, updated_at: timestamp };
  let request;
  if (current) {
    request = connection().from('quotations').update(changes).eq('id', id)
      .eq('updated_at', current.updated_at).is('state->>_deletedAt', null);
  } else {
    request = connection().from('quotations').insert({ id, job_name: 'Deleted quotation', ...changes });
  }
  const { data: deleted, error, status } = await request.select('id').maybeSingle();
  checkError(error, status);
  if (!deleted) throw new QuoteConflictError('The quotation changed while deleting. Reload history and try again.');
  return { success: true };
};

export const duplicateQuotation = async (id) => {
  const orig = await getQuotation(id);
  if (!orig) throw new Error('Not found');
  return saveQuotation({
    id: crypto.randomUUID(), expected_revision: 0,
    client_id: orig.client_id,
    job_name: orig.job_name + ' (Copy)',
    quote_number: generateQuoteNumber(),
    version: 1,
    is_repeat_order: false,
    state: { ...migrateState(orig.state), _quoteNumber: null, issueSnapshot: null, issuedAt: null, revisedAt: null, jobName: (orig.state?.jobName || '') + ' (Copy)' },
  });
};

export const getAllQuotations = async () => {
  const { data, error, status } = await connection()
    .from('quotations')
    .select('*, clients(name)')
    .is('state->>_deletedAt', null)
    .order('updated_at', { ascending: false })
    .limit(200);
  checkError(error, status);
  return (data || []).map(q => ({ ...normalizeQuote(q), clientName: q.clients?.name || '' }));
};

export const getLatestQuotation = async clientId => {
  const { data, error, status } = await connection().from('quotations').select('*').eq('client_id', clientId)
    .is('state->>_deletedAt', null).order('updated_at', { ascending: false }).limit(1).maybeSingle();
  checkError(error, status);
  return normalizeQuote(data);
};

export { createClient_ as createClient };
