import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, User, Phone, Mail, Clock, FileText } from 'lucide-react';
import { getClients, createClient_ } from '../../lib/db';
import { formatINR } from '../../lib/calc';
import { calcAll } from '../../lib/calc';

const Skeleton = () => (
  <div className="rounded-xl border border-[var(--border)] p-5 space-y-3 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-[var(--border)]" />
      <div className="space-y-1.5 flex-1">
        <div className="h-4 bg-[var(--border)] rounded w-32" />
        <div className="h-3 bg-[var(--border)] rounded w-20" />
      </div>
    </div>
    <div className="h-3 bg-[var(--border)] rounded w-full" />
  </div>
);

const ClientCard = ({ client, quotations = [], onLoadLatest, onViewAll }) => {
  const initials = client.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const lastQuote = quotations[0];
  const lastTotal = lastQuote ? calcAll(lastQuote.state || {}).finalTotal : 0;
  const lastDate = lastQuote ? new Date(lastQuote.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--copper)] transition-all duration-200 hover:shadow-lg"
      data-testid={`client-card-${client.id}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-[var(--copper)] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-bold font-sans">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-[var(--text-primary)] truncate">{client.name}</h3>
          <div className="flex items-center gap-1 mt-0.5">
            <FileText size={11} strokeWidth={1.5} className="text-[var(--text-secondary)]" />
            <span className="text-xs text-[var(--text-secondary)]">{quotations.length} quotation{quotations.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {lastDate && (
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-1 text-[var(--text-secondary)]">
            <Clock size={11} strokeWidth={1.5} />
            <span>Last: {lastDate}</span>
          </div>
          <span className="text-[var(--copper)] font-semibold tabular-nums">{formatINR(lastTotal)}</span>
        </div>
      )}

      {client.email && (
        <p className="text-xs text-[var(--text-secondary)] mb-3 truncate flex items-center gap-1">
          <Mail size={11} strokeWidth={1.5} /> {client.email}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onLoadLatest(client, lastQuote)}
          className="flex-1 py-2 px-3 text-xs font-semibold bg-[var(--copper)] text-white rounded-lg shimmer-btn transition-all hover:-translate-y-0.5"
          data-clickable
          data-testid={`client-load-${client.id}`}
        >
          {lastQuote ? 'Load Latest' : 'New Quote'}
        </button>
        <button
          onClick={() => onViewAll(client)}
          className="px-3 py-2 text-xs text-[var(--copper)] border border-[var(--copper)] rounded-lg hover:bg-[var(--copper-glow)] transition-all"
          data-clickable
          data-testid={`client-viewall-${client.id}`}
        >
          View All
        </button>
      </div>
    </motion.div>
  );
};

const NewClientForm = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const client = await createClient_({ name: name.trim(), phone, email });
      onSubmit(client);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="mt-4 border border-[var(--copper)] rounded-xl p-5 bg-[var(--copper-glow)] space-y-3"
      data-testid="new-client-form"
    >
      <h4 className="font-display font-semibold text-[var(--text-primary)]">New Client</h4>
      <div>
        <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Client Name *</label>
        <input
          value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Acme Packaging Ltd."
          required
          className="input-copper w-full mt-1 px-3 py-2 text-sm rounded-lg"
          data-testid="new-client-name"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98..." className="input-copper w-full mt-1 px-3 py-2 text-sm rounded-lg" data-testid="new-client-phone" />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="email@co.in" className="input-copper w-full mt-1 px-3 py-2 text-sm rounded-lg" data-testid="new-client-email" />
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={loading} className="flex-1 py-2.5 text-sm font-semibold bg-[var(--copper)] text-white rounded-lg shimmer-btn transition-all hover:-translate-y-0.5 disabled:opacity-60" data-clickable data-testid="new-client-submit">
          {loading ? 'Creating...' : 'Create Client'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2.5 text-sm border border-[var(--border)] rounded-lg hover:border-[var(--copper)] transition-all" data-clickable>
          Cancel
        </button>
      </div>
    </motion.form>
  );
};

const ClientSelectionModal = ({ onSelect, isOpen }) => {
  const [clients, setClients] = useState([]);
  const [clientQuotes, setClientQuotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    loadClients();
  }, [isOpen]);

  const loadClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getClients();
      setClients(data);
      // Load quote counts and last quotes
      const { getQuotationsByClient } = await import('../../lib/db');
      const quoteMap = {};
      await Promise.all(data.map(async (c) => {
        try {
          quoteMap[c.id] = await getQuotationsByClient(c.id);
        } catch { quoteMap[c.id] = []; }
      }));
      setClientQuotes(quoteMap);
    } catch (e) {
      setError('Failed to load clients. Using cached data.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.email || '').toLowerCase().includes(search.toLowerCase()));

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundImage: 'url(https://images.pexels.com/photos/6699772/pexels-photo-6699772.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=1080&w=1920)', backgroundSize: 'cover', backgroundPosition: 'center' }}
        data-testid="client-selection-modal"
      >
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-4 border-b border-[var(--border)]">
            <h1 className="font-display text-3xl font-bold text-[var(--text-primary)]">Dat Pack Co.</h1>
            <p className="text-[var(--text-secondary)] mt-1 text-sm">Select a client to continue</p>
            {error && <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">{error}</div>}

            <div className="relative mt-4">
              <Search size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search clients..."
                className="input-copper w-full pl-9 pr-4 py-2.5 text-sm rounded-lg"
                data-testid="client-search-input"
              />
            </div>
          </div>

          {/* Client Grid */}
          <div className="flex-1 overflow-y-auto px-8 py-5">
            {loading ? (
              <div className="grid grid-cols-2 gap-4">
                {[1,2,3,4].map(i => <Skeleton key={i} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-secondary)]">
                <User size={40} strokeWidth={1} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">{search ? 'No clients match your search.' : 'No clients yet.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filtered.map(client => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    quotations={clientQuotes[client.id] || []}
                    onLoadLatest={(c, q) => onSelect(c, q)}
                    onViewAll={(c) => onSelect(c, null, true)}
                  />
                ))}
              </div>
            )}

            {showNewForm ? (
              <NewClientForm
                onSubmit={(client) => { setShowNewForm(false); onSelect(client, null); }}
                onCancel={() => setShowNewForm(false)}
              />
            ) : (
              <button
                onClick={() => setShowNewForm(true)}
                className="mt-4 w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold bg-[var(--copper)] text-white rounded-xl shimmer-btn hover:-translate-y-0.5 transition-all"
                data-clickable
                data-testid="new-client-btn"
              >
                <Plus size={16} strokeWidth={2} />
                New Client
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ClientSelectionModal;
