import { supabase, hasSupabase } from './supabase';
import * as local from './db.local';

// Re-export createClient_ as createClient for consistency
export const createClient_ = hasSupabase ? async (data) => {
  const { data: client, error } = await supabase
    .from('clients')
    .insert([{ name: data.name, phone: data.phone || '', email: data.email || '' }])
    .select()
    .single();
  if (error) throw error;
  return client;
} : local.createClient_;

export const getClients = hasSupabase ? async () => {
  const { data, error } = await supabase
    .from('clients')
    .select('*, quotations(count)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
} : local.getClients;

export const getQuotationsByClient = hasSupabase ? async (clientId) => {
  const { data, error } = await supabase
    .from('quotations')
    .select('*')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
} : local.getQuotationsByClient;

export const getQuotation = hasSupabase ? async (id) => {
  const { data, error } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
} : local.getQuotation;

export const saveQuotation = hasSupabase ? async (data) => {
  const payload = {
    id: data.id,
    client_id: data.client_id,
    job_name: data.job_name || 'Untitled',
    quote_number: data.quote_number,
    version: data.version || 1,
    is_repeat_order: data.is_repeat_order || false,
    state: data.state,
    updated_at: new Date().toISOString(),
  };
  if (!payload.id) delete payload.id;
  const { data: saved, error } = await supabase
    .from('quotations')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return saved;
} : local.saveQuotation;

export const deleteQuotation = hasSupabase ? async (id) => {
  const { error } = await supabase.from('quotations').delete().eq('id', id);
  if (error) throw error;
} : local.deleteQuotation;

export const duplicateQuotation = hasSupabase ? async (id) => {
  const orig = await getQuotation(id);
  if (!orig) throw new Error('Not found');
  const { data: copy, error } = await supabase.from('quotations').insert([{
    client_id: orig.client_id,
    job_name: orig.job_name + ' (Copy)',
    quote_number: 'QT-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(Math.floor(Math.random() * 9000) + 1000),
    version: 1,
    is_repeat_order: orig.is_repeat_order,
    state: { ...orig.state, jobName: (orig.state?.jobName || '') + ' (Copy)' },
  }]).select().single();
  if (error) throw error;
  return copy;
} : local.duplicateQuotation;
