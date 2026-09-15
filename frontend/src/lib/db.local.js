import { migrateState, generateQuoteNumber } from './calc';
import { readJSON, writeJSON, isRecordArray, isRecord } from './storage';
import { QuoteConflictError } from './saveCoordinator';
import { validateQuote } from './validation';

// localStorage adapter — implements same interface as db.js
const PREFIX = 'datpack_';

const get = key => readJSON(PREFIX + key, [], value => isRecordArray(value) && value.every(item =>
  key === 'clients' ? typeof item.name === 'string' : item.deleted_at || (typeof item.client_id === 'string' && isRecord(item.state))));
const set = (key, val) => writeJSON(PREFIX + key, val);

const genId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const clients = () => get('clients');
const quotations = () => get('quotations').filter(quote => !quote.deleted_at);

export const getClients = async () => {
  const quotes = quotations();
  return clients().map(client => ({ ...client, quotationCount: quotes.filter(quote => quote.client_id === client.id).length }))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

export const createClient_ = async (data) => {
  const client = { id: genId(), name: data.name, phone: data.phone || '', email: data.email || '', created_at: now() };
  const all = clients();
  all.push(client);
  set('clients', all);
  return client;
};

export const getQuotationsByClient = async (clientId) => {
  return quotations()
    .filter(q => q.client_id === clientId)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
};

export const getQuotation = async (id) => {
  return quotations().find(q => q.id === id) || null;
};

export const saveQuotation = async (data) => {
  const all = get('quotations');
  const state = migrateState(data.state);
  const validation = validateQuote(state);
  if (validation.status === 'invalid') throw new Error(validation.messages.join(' '));
  const idx = all.findIndex(q => q.id === data.id);
  const previous = all[idx];
  const expected = data.expected_revision ?? data.revision ?? 0;
  if (previous?.deleted_at || (previous && previous.client_id !== data.client_id) || expected !== (previous?.revision || 0)) throw new QuoteConflictError();
  const { expected_revision, ...payload } = data;
  const quoteNumber = previous?.quote_number || data.quote_number || generateQuoteNumber();
  if (all.some(quote => quote.id !== data.id && quote.quote_number === quoteNumber && quote.version === (data.version || 1))) {
    throw new QuoteConflictError('Quotation number already exists. Start a new draft or retry with a new quotation number.');
  }
  const updated = {
    ...payload, id: data.id || genId(), quote_number: quoteNumber, version: data.version || 1,
    revision: expected + 1, is_repeat_order: false,
    state,
    created_at: idx >= 0 ? all[idx].created_at : (data.created_at || now()),
    updated_at: now(),
  };
  if (idx >= 0) { all[idx] = updated; } else { all.push(updated); }
  set('quotations', all);
  return updated;
};

export const deleteQuotation = async (id) => {
  const all = get('quotations');
  const existing = all.find(quote => quote.id === id);
  set('quotations', existing
    ? all.map(quote => quote.id === id ? { ...quote, deleted_at: now(), revision: (quote.revision || 0) + 1 } : quote)
    : [...all, { id, deleted_at: now(), revision: 1 }]);
  return { success: true };
};

export const duplicateQuotation = async (id) => {
  const orig = await getQuotation(id);
  if (!orig) throw new Error('Quotation not found');
  const copy = {
    ...orig,
    id: genId(),
    job_name: orig.job_name + ' (Copy)',
    quote_number: generateQuoteNumber(),
    version: 1,
    revision: 0,
    is_repeat_order: false,
    created_at: now(),
    updated_at: now(),
    state: { ...migrateState(orig.state), _quoteNumber: null, issueSnapshot: null, issuedAt: null, revisedAt: null, jobName: (orig.state?.jobName || '') + ' (Copy)' },
  };
  return saveQuotation({ ...copy, expected_revision: 0 });
};

export const getLatestQuotation = async clientId => (await getQuotationsByClient(clientId))[0] || null;

export const getAllQuotations = async () => {
  const allClients = clients();
  return quotations()
    .map(q => ({
      ...q,
      clientName: allClients.find(c => c.id === q.client_id)?.name || '',
    }))
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 200);
};
