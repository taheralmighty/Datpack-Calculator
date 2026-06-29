import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Package2, SearchX, Mail } from 'lucide-react';
import useClientStore from '../../store/clientStore';
import useCalculatorStore from '../../store/calculatorStore';
import { formatINR } from '../../lib/calc';
import { hasSupabase } from '../../lib/supabase';
import DarkModeToggle from '../ui/DarkModeToggle';
import logoCopper from '../../assets/logo-copper.png';

/* ─── Constants ─────────────────────────────────────────────────── */
const QUOTES_PER_PAGE = 6;

/* ─── Helpers ───────────────────────────────────────────────────── */
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')).toUpperCase();
};

const getQuoteCount = (client) => {
  if (!client.quotations) return 0;
  if (Array.isArray(client.quotations)) {
    if (client.quotations[0]?.count !== undefined) return client.quotations[0].count;
    return client.quotations.length;
  }
  return 0;
};

const getGrandTotal = (q) => q.grandTotal || q.state?.grandTotal || 0;

/* ─── Shared styles ─────────────────────────────────────────────── */
const pillButtonStyle = {
  fontSize: '10px',
  border: '1px solid #C8956C',
  color: '#C8956C',
  borderRadius: '6px',
  padding: '4px 10px',
  background: 'none',
  cursor: 'pointer',
  fontFamily: "'DM Sans', sans-serif",
  lineHeight: 1,
};

const textButtonStyle = {
  fontSize: '10px',
  border: 'none',
  background: 'none',
  color: 'var(--modal-text-muted)',
  cursor: 'pointer',
  fontFamily: "'DM Sans', sans-serif",
  lineHeight: 1,
  padding: 0,
  transition: 'color 150ms ease',
};

const darkInputStyle = {
  width: '100%',
  background: 'var(--modal-input-bg)',
  border: '1px solid rgba(200,149,108,0.2)',
  borderRadius: '12px',
  padding: '11px 12px',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: '13px',
  color: 'var(--modal-text-base)',
  outline: 'none',
  transition: 'all 200ms ease',
  display: 'block',
  boxSizing: 'border-box',
};

/* ─── loadAsTemplate (module-level helper) ───────────────────────── */
function loadAsTemplate(quotation, clients) {
  const templateState = {
    ...quotation.state,
    jobName: (quotation.state?.jobName || quotation.job_name || '') + ' (Copy)',
  };
  useCalculatorStore.setState(templateState);
  const client = clients.find((c) => c.id === quotation.client_id);
  if (client) useClientStore.getState().selectClient(client);
  useClientStore.getState().setClientModalOpen(false);
}

/* ─── Sub-components ─────────────────────────────────────────────── */

const SectionLabel = ({ children, count }) => (
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', marginTop: '4px' }}>
    <span style={{
      fontFamily: "'DM Sans', sans-serif",
      fontSize: '11.5px',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      fontWeight: 500,
      color: 'rgba(200,149,108,0.75)',
    }}>
      {children}
    </span>
    {count != null && (
      <span style={{
        background: 'rgba(200,149,108,0.15)',
        color: 'rgba(200,149,108,0.8)',
        fontSize: '10px',
        borderRadius: '20px',
        padding: '1px 8px',
        marginLeft: '8px',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {count} found
      </span>
    )}
  </div>
);

const SkeletonTile = () => (
  <div className="animate-pulse" style={{
    background: 'var(--modal-skeleton-bg)',
    border: '1px solid rgba(200,149,108,0.08)',
    borderRadius: '14px',
    height: '120px',
  }} />
);

const SkeletonCard = () => (
  <div className="animate-pulse" style={{
    background: 'var(--modal-skeleton-bg)',
    border: '1px solid rgba(200,149,108,0.08)',
    borderRadius: '12px',
    height: '64px',
    marginBottom: '10px',
  }} />
);

const RepeatBadge = () => (
  <span style={{
    fontSize: '9px',
    textTransform: 'uppercase',
    background: 'rgba(200,149,108,0.2)',
    color: '#C8956C',
    padding: '2px 6px',
    borderRadius: '20px',
    letterSpacing: '0.05em',
    flexShrink: 0,
    fontFamily: "'DM Sans', sans-serif",
  }}>
    REPEAT
  </span>
);

/* Recent Quotation Tile (2×2 grid) */
const RecentQuotationTile = ({ quotation: q, index, onLoad, onTemplate, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const gt = getGrandTotal(q);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(200,149,108,0.10)' : 'rgba(200,149,108,0.05)',
        border: `1px solid ${hovered ? 'rgba(200,149,108,0.4)' : 'rgba(200,149,108,0.15)'}`,
        borderRadius: '14px',
        padding: '14px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 200ms ease',
        transform: hovered ? 'scale(1.01)' : 'scale(1)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '17px',
          fontWeight: 500,
          color: 'var(--color-text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          minWidth: 0,
        }}>
          {q.job_name || 'Untitled'}
        </span>
        {q.is_repeat_order && <RepeatBadge />}
      </div>

      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12.5px', color: 'rgba(200,149,108,0.9)', marginTop: '4px' }}>
        {q.clientName || '—'}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
        <span style={{ fontFamily: "'DM Sans'", fontSize: '11.5px', color: 'var(--modal-text-dimmed)' }}>
          {q.quote_number || '—'}
        </span>
        <span style={{ fontFamily: "'DM Sans'", fontSize: '12px', fontWeight: 600, color: 'rgba(200,149,108,1)' }}>
          {gt > 0 ? formatINR(gt) : '₹—'}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '12px', flexWrap: 'wrap', gap: '6px' }}>
        <span style={{ fontFamily: "'DM Sans'", fontSize: '11.5px', color: 'var(--modal-text-dimmed)' }}>
          {formatDate(q.updated_at)}
        </span>
        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
          <button onClick={(e) => { e.stopPropagation(); onLoad(e); }} style={pillButtonStyle}>Load</button>
          <button
            onClick={(e) => { e.stopPropagation(); onTemplate(e); }}
            style={textButtonStyle}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#C8956C')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--modal-text-muted)')}
          >
            Template →
          </button>
        </div>
      </div>
    </motion.div>
  );
};

/* Client Card (single column) */
const ClientCard = ({ client, index, compact = false, onSelect, onLatest, onAll }) => {
  const [hovered, setHovered] = useState(false);
  const initials = getInitials(client.name);
  const qCount = getQuoteCount(client);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(200,149,108,0.06)' : 'var(--modal-item-bg)',
        border: `1px solid ${hovered ? 'rgba(200,149,108,0.38)' : 'rgba(200,149,108,0.1)'}`,
        borderRadius: '12px',
        padding: compact ? '10px 14px' : '12px 14px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '10px',
        transition: 'all 200ms ease',
        transform: hovered ? 'translateX(2px)' : 'translateX(0)',
      }}
    >
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(200,149,108,0.75), rgba(200,149,108,0.35))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: '14px',
        fontWeight: 500,
        color: 'white',
        flexShrink: 0,
      }}>
        {initials}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'DM Sans'", fontSize: '14px', fontWeight: 500, color: 'var(--modal-text-base)' }}>
          {client.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'DM Sans'", fontSize: '12px', color: 'var(--modal-text-muted)' }}>
            {qCount} quotation{qCount !== 1 ? 's' : ''}
          </span>
          {client.email && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '12px', color: 'var(--modal-text-dimmed)', fontFamily: "'DM Sans'" }}>
              <Mail size={10} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                {client.email}
              </span>
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', flexShrink: 0, maxWidth: '100px' }}>
        <span style={{ fontFamily: "'DM Sans'", fontSize: '12px', color: 'var(--modal-text-dimmed)' }}>
          {formatDate(client.created_at)}
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={onLatest} style={pillButtonStyle}>Latest</button>
          <button
            onClick={onAll}
            style={textButtonStyle}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#C8956C')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--modal-text-muted)')}
          >
            All →
          </button>
        </div>
      </div>
    </motion.div>
  );
};

/* Search Quotation Row */
const SearchQuotationRow = ({ quotation: q, index, onLoad, onTemplate, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const gt = getGrandTotal(q);

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(200,149,108,0.06)' : 'var(--modal-item-bg)',
        border: `1px solid ${hovered ? 'rgba(200,149,108,0.38)' : 'rgba(200,149,108,0.1)'}`,
        borderRadius: '12px',
        padding: '11px 14px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '8px',
        transition: 'all 200ms ease',
      }}
    >
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(200,149,108,0.6)', flexShrink: 0, marginTop: '2px' }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'DM Sans'", fontSize: '12px', fontWeight: 500, color: 'var(--modal-text-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {q.job_name || 'Untitled'}
          </span>
          {q.is_repeat_order && <RepeatBadge />}
        </div>
        <div style={{ display: 'flex', gap: '4px', marginTop: '3px', alignItems: 'center' }}>
          <span style={{ fontFamily: "'DM Sans'", fontSize: '11px', color: 'rgba(200,149,108,0.88)' }}>{q.clientName || '—'}</span>
          <span style={{ color: 'var(--modal-text-dimmed)', fontSize: '11px' }}>·</span>
          <span style={{ fontFamily: "'DM Sans'", fontSize: '11px', color: 'var(--modal-text-dimmed)' }}>{q.quote_number || '—'}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0, maxWidth: '110px' }}>
        <span style={{ fontFamily: "'DM Sans'", fontSize: '10px', color: 'rgba(200,149,108,0.9)' }}>
          {gt > 0 ? formatINR(gt) : '₹—'}
        </span>
        <span style={{ fontFamily: "'DM Sans'", fontSize: '10px', color: 'var(--modal-text-dimmed)' }}>
          {formatDate(q.updated_at)}
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={onLoad} style={pillButtonStyle}>Load</button>
          <button
            onClick={onTemplate}
            style={textButtonStyle}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#C8956C')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--modal-text-muted)')}
          >
            Template
          </button>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────── */
export default function ClientSelectionModal() {
  const {
    clients,
    allQuotations,
    isLoadingClients,
    fetchClients,
    selectClient,
    createNewClient,
    loadQuotation,
    setClientModalOpen,
    setHistoryOpen,
  } = useClientStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [quotationPage, setQuotationPage] = useState(0);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: '', phone: '', email: '' });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    setQuotationPage(0);
  }, [searchQuery]);

  const filteredClients = useMemo(
    () => clients.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [clients, searchQuery]
  );

  const filteredQuotations = useMemo(
    () =>
      allQuotations.filter(
        (q) =>
          q.job_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.quote_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.clientName?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [allQuotations, searchQuery]
  );

  const recentQuotations = useMemo(
    () => [...allQuotations].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 4),
    [allQuotations]
  );

  const totalPages = Math.ceil(filteredQuotations.length / QUOTES_PER_PAGE);
  const pagedQuotations = filteredQuotations.slice(
    quotationPage * QUOTES_PER_PAGE,
    (quotationPage + 1) * QUOTES_PER_PAGE
  );

  const handleLoadQuotation = (q) => {
    const client = clients.find((c) => c.id === q.client_id);
    if (client) selectClient(client);
    loadQuotation(q);
    setClientModalOpen(false);
  };

  const handleClientLatest = (client, e) => {
    e.stopPropagation();
    selectClient(client);
    const latest = allQuotations
      .filter(q => q.client_id === client.id)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
    if (latest) loadQuotation(latest);
    setClientModalOpen(false);
  };

  const handleClientAll = (client, e) => {
    e.stopPropagation();
    selectClient(client);
    setClientModalOpen(false);
    setTimeout(() => setHistoryOpen(true), 150);
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!newClientData.name.trim()) return;
    setIsCreating(true);
    try {
      await createNewClient(newClientData);
      setShowNewClientForm(false);
      setNewClientData({ name: '', phone: '', email: '' });
    } catch (err) {
      console.error('[ClientSelectionModal] createNewClient error:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const focusInput = (e) => {
    e.target.style.borderColor = 'rgba(200,149,108,0.55)';
    e.target.style.boxShadow = '0 0 0 3px rgba(200,149,108,0.1)';
  };
  const blurInput = (e) => {
    e.target.style.borderColor = 'rgba(200,149,108,0.2)';
    e.target.style.boxShadow = 'none';
  };

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at 20% 50%, rgba(200,149,108,0.09) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(200,149,108,0.06) 0%, transparent 50%), var(--modal-overlay)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        style={{
          maxWidth: '672px',
          width: '100%',
          maxHeight: '90vh',
          background: 'var(--modal-card-bg)',
          border: '1px solid rgba(200,149,108,0.2)',
          borderRadius: '24px',
          boxShadow: 'var(--modal-card-shadow)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      >
        {/* ── Header ── */}
        <div style={{ padding: '32px 32px 20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '6px' }}>
            <img
              src={logoCopper}
              alt=""
              style={{
                height: 'clamp(28px, 6vw, 44px)',
                marginRight: '16px',
                filter: 'brightness(0) invert(0.65) sepia(1) saturate(2.5) hue-rotate(338deg)',
                opacity: 0.92,
                flexShrink: 0,
              }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <span style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(1.4rem, 4vw, 2.6rem)',
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-text-primary)',
              lineHeight: 1,
              flex: 1,
              minWidth: 0,
            }}>
              Dat Pack Co.
            </span>
            <DarkModeToggle />
          </div>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '0.82rem',
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: 'rgba(200,149,108,0.75)',
            marginTop: '6px',
            marginBottom: 0,
            fontWeight: 500,
          }}>
            Select a client or search quotations
          </p>
          <div style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(200,149,108,0.35), transparent)',
            marginTop: '18px',
          }} />
          {!hasSupabase && (
            <div style={{
              marginTop: '12px',
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.25)',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '11px',
              color: 'rgba(251,191,36,0.75)',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Running in offline mode — data saved locally
            </div>
          )}
        </div>

        {/* ── Unified Search ── */}
        <div style={{ padding: '0 32px 12px', flexShrink: 0 }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(200,149,108,0.6)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients or quotations..."
              style={{
                ...darkInputStyle,
                fontSize: '14px',
                paddingLeft: '36px',
                paddingRight: searchQuery ? '36px' : '14px',
                marginBottom: 0,
              }}
              onFocus={focusInput}
              onBlur={blurInput}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--modal-text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color 150ms ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(200,149,108,0.7)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--modal-text-muted)')}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 32px 8px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(200,149,108,0.25) transparent',
        }}>
          {searchQuery === '' ? (
            <>
              <SectionLabel>Recent Quotations</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', marginBottom: '4px' }}>
                {isLoadingClients && allQuotations.length === 0
                  ? [0, 1, 2, 3].map((i) => <SkeletonTile key={i} />)
                  : recentQuotations.length === 0
                    ? (
                      <div style={{ gridColumn: 'span 2', color: 'var(--modal-text-dimmed)', fontSize: '12px', textAlign: 'center', padding: '20px', fontFamily: "'DM Sans'" }}>
                        No recent quotations
                      </div>
                    )
                    : recentQuotations.map((q, i) => (
                      <RecentQuotationTile
                        key={q.id}
                        quotation={q}
                        index={i}
                        onLoad={(e) => { e.stopPropagation(); handleLoadQuotation(q); }}
                        onTemplate={(e) => { e.stopPropagation(); loadAsTemplate(q, clients); }}
                        onClick={() => handleLoadQuotation(q)}
                      />
                    ))
                }
              </div>

              <div style={{ height: '1px', background: 'var(--modal-divider)', margin: '20px 0 16px' }} />

              <SectionLabel>Clients</SectionLabel>
              {isLoadingClients
                ? [0, 1, 2].map((i) => <SkeletonCard key={i} />)
                : clients.length === 0
                  ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--modal-text-dimmed)', fontSize: '13px', fontFamily: "'DM Sans'" }}>
                      <Package2 size={24} style={{ margin: '0 auto 10px', opacity: 0.3, color: '#C8956C', display: 'block' }} />
                      No clients yet. Add your first client below.
                    </div>
                  )
                  : clients.map((client, i) => (
                    <ClientCard
                      key={client.id}
                      client={client}
                      index={i}
                      onSelect={() => { selectClient(client); setClientModalOpen(false); }}
                      onLatest={(e) => handleClientLatest(client, e)}
                      onAll={(e) => handleClientAll(client, e)}
                    />
                  ))
              }
            </>
          ) : (
            <>
              {filteredClients.length === 0 && filteredQuotations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--modal-text-muted)' }}>
                  <SearchX size={24} style={{ margin: '0 auto 12px', opacity: 0.4, color: '#C8956C', display: 'block' }} />
                  <div style={{ fontSize: '13px', fontFamily: "'DM Sans'" }}>No results for "{searchQuery}"</div>
                  <div style={{ fontSize: '11px', color: 'var(--modal-text-dimmed)', marginTop: '5px', fontFamily: "'DM Sans'" }}>
                    Try a job name, quote number, or client name
                  </div>
                </div>
              ) : (
                <>
                  {filteredClients.length > 0 && (
                    <>
                      <SectionLabel>Clients</SectionLabel>
                      {filteredClients.map((client, i) => (
                        <ClientCard
                          key={client.id}
                          client={client}
                          index={i}
                          compact
                          onSelect={() => { selectClient(client); setClientModalOpen(false); }}
                          onLatest={(e) => handleClientLatest(client, e)}
                          onAll={(e) => handleClientAll(client, e)}
                        />
                      ))}
                    </>
                  )}

                  {filteredQuotations.length > 0 && (
                    <>
                      <SectionLabel count={filteredQuotations.length}>Quotations</SectionLabel>
                      {pagedQuotations.map((q, i) => (
                        <SearchQuotationRow
                          key={q.id}
                          quotation={q}
                          index={i}
                          onLoad={(e) => { e.stopPropagation(); handleLoadQuotation(q); }}
                          onTemplate={(e) => { e.stopPropagation(); loadAsTemplate(q, clients); }}
                          onClick={() => handleLoadQuotation(q)}
                        />
                      ))}

                      {totalPages > 1 && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', marginTop: '12px', marginBottom: '4px' }}>
                          <button
                            onClick={() => setQuotationPage((p) => p - 1)}
                            disabled={quotationPage === 0}
                            style={{ fontFamily: "'DM Sans'", fontSize: '11px', color: '#C8956C', opacity: quotationPage === 0 ? 0.4 : 0.9, background: 'none', border: 'none', cursor: quotationPage === 0 ? 'not-allowed' : 'pointer' }}
                          >
                            ← Prev
                          </button>
                          <span style={{ fontFamily: "'DM Sans'", fontSize: '11px', color: 'var(--modal-text-muted)' }}>
                            Page {quotationPage + 1} of {totalPages}
                          </span>
                          <button
                            onClick={() => setQuotationPage((p) => p + 1)}
                            disabled={quotationPage >= totalPages - 1}
                            style={{ fontFamily: "'DM Sans'", fontSize: '11px', color: '#C8956C', opacity: quotationPage >= totalPages - 1 ? 0.4 : 0.9, background: 'none', border: 'none', cursor: quotationPage >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
                          >
                            Next →
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* ── New Client Section ── */}
        <div style={{ padding: '16px 32px 28px', flexShrink: 0, borderTop: '1px solid rgba(200,149,108,0.1)' }}>
          <AnimatePresence mode="wait">
            {!showNewClientForm ? (
              <motion.button
                key="add-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowNewClientForm(true)}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #C8956C 0%, #b8825c 100%)',
                  color: 'white',
                  borderRadius: '12px',
                  padding: '12px',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '14px',
                  letterSpacing: '0.06em',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 24px rgba(200,149,108,0.2)',
                  transition: 'all 200ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 6px 32px rgba(200,149,108,0.38)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 24px rgba(200,149,108,0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                + New Client
              </motion.button>
            ) : (
              <motion.form
                key="new-client-form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                onSubmit={handleCreateClient}
                style={{ overflow: 'hidden' }}
              >
                {[
                  { field: 'name', placeholder: 'Client Name *', type: 'text', required: true },
                  { field: 'phone', placeholder: 'Phone (optional)', type: 'tel', required: false },
                  { field: 'email', placeholder: 'Email (optional)', type: 'email', required: false },
                ].map(({ field, placeholder, type, required }, idx) => (
                  <motion.input
                    key={field}
                    type={type}
                    placeholder={placeholder}
                    required={required}
                    value={newClientData[field]}
                    onChange={(e) => setNewClientData((d) => ({ ...d, [field]: e.target.value }))}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    style={{ ...darkInputStyle, marginBottom: '8px' }}
                    onFocus={focusInput}
                    onBlur={blurInput}
                  />
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <button
                    type="submit"
                    disabled={isCreating}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #C8956C 0%, #b8825c 100%)',
                      color: 'white',
                      borderRadius: '10px',
                      padding: '11px',
                      fontFamily: "'DM Sans'",
                      fontSize: '13px',
                      border: 'none',
                      cursor: isCreating ? 'not-allowed' : 'pointer',
                      opacity: isCreating ? 0.7 : 1,
                      transition: 'opacity 150ms ease',
                    }}
                  >
                    {isCreating ? 'Creating…' : 'Create Client'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewClientForm(false);
                      setNewClientData({ name: '', phone: '', email: '' });
                    }}
                    style={{
                      marginLeft: '16px',
                      background: 'none',
                      border: 'none',
                      color: '#C8956C',
                      fontSize: '13px',
                      fontFamily: "'DM Sans'",
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}


