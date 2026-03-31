// localStorage adapter — implements same interface as db.js
const PREFIX = 'datpack_';

const get = (key) => {
  try { return JSON.parse(localStorage.getItem(PREFIX + key) || 'null'); }
  catch { return null; }
};
const set = (key, val) => localStorage.setItem(PREFIX + key, JSON.stringify(val));

const genId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

const clients = () => get('clients') || [];
const quotations = () => get('quotations') || [];

export const getClients = async () => {
  return clients().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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
  const all = quotations();
  const idx = all.findIndex(q => q.id === data.id);
  const updated = { ...data, updated_at: now() };
  if (idx >= 0) { all[idx] = updated; } else { all.push({ ...updated, created_at: updated.created_at || now() }); }
  set('quotations', all);
  return updated;
};

export const deleteQuotation = async (id) => {
  set('quotations', quotations().filter(q => q.id !== id));
};

export const duplicateQuotation = async (id) => {
  const orig = await getQuotation(id);
  if (!orig) throw new Error('Quotation not found');
  const copy = {
    ...orig,
    id: genId(),
    job_name: orig.job_name + ' (Copy)',
    quote_number: 'QT-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(Math.floor(Math.random() * 9000) + 1000),
    version: 1,
    created_at: now(),
    updated_at: now(),
    state: { ...orig.state, jobName: (orig.state.jobName || '') + ' (Copy)' },
  };
  const all = quotations();
  all.push(copy);
  set('quotations', all);
  return copy;
};
