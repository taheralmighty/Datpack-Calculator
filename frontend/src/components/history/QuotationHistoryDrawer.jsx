import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Trash2, Download, Package2 } from 'lucide-react';
import useClientStore from '../../store/clientStore';
import { quotationPreview } from '../../lib/calc';
import { generatePDF } from '../../lib/pdf';
import Dialog from '../ui/Dialog';

/* ─── Helpers ─────────────────────────────────────────────────────── */
const fmtDate = (str) => {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* ─── Pill Sort Button ────────────────────────────────────────────── */
const SortPill = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      fontSize: '11px',
      fontFamily: "'DM Sans', sans-serif",
      padding: '4px 12px',
      borderRadius: '20px',
      border: active ? '1px solid #C8956C' : '1px solid var(--color-border)',
      background: active ? 'rgba(200,149,108,0.1)' : 'transparent',
      color: active ? '#C8956C' : 'var(--color-text-secondary)',
      cursor: 'pointer',
      transition: 'all 150ms ease',
      fontWeight: active ? 500 : 400,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
  >
    {label}
  </button>
);

/* ─── Toast ───────────────────────────────────────────────────────── */
const InlineToast = ({ message }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    style={{
      position: 'fixed',
      bottom: '80px',
      right: '16px',
      left: '16px',
      maxWidth: '400px',
      marginLeft: 'auto',
      background: '#1A1A1A',
      color: 'white',
      fontSize: '12px',
      padding: '8px 16px',
      borderRadius: '10px',
      zIndex: 999999,
      fontFamily: "'DM Sans', sans-serif",
      pointerEvents: 'none',
    }}
  >
    {message}
  </motion.div>
);

/* ─── Quotation Card ──────────────────────────────────────────────── */
const QuotationCard = ({ quotation: q, onLoad, onDuplicate, onExport, onDelete }) => {
  const [hovered, setHovered] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const preview = quotationPreview(q);

  return (
    <motion.div
      className="history-quotation-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false); }}
      style={{
        border: `1px solid ${hovered ? '#C8956C' : 'var(--color-border)'}`,
        borderRadius: '14px',
        padding: '16px',
        marginBottom: '12px',
        background: hovered ? 'rgba(200,149,108,0.03)' : 'var(--color-surface)',
        transition: 'border-color 200ms ease, background 200ms ease',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '16px',
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {q.job_name || 'Untitled'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              {q.quote_number || '—'}{q.version > 1 ? ` · v${q.version}` : ''}
            </span>
          </div>
        </div>

        {/* Trash */}
        {!confirmDelete ? (
          <button
            aria-label={`Delete ${q.job_name || 'quotation'}`} className="history-delete"
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
            style={{
              transition: 'opacity 150ms ease',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#EF4444',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(q.id); }}
              style={{ fontSize: '11px', color: '#EF4444', border: '1px solid #FCA5A5', borderRadius: '6px', padding: '2px 8px', background: 'none', cursor: 'pointer' }}
            >
              Yes
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
              style={{ fontSize: '11px', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '2px 8px', background: 'none', cursor: 'pointer' }}
            >
              No
            </button>
          </div>
        )}
      </div>

      {/* Middle row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'var(--color-text-secondary)' }}>
            Qty: {(q.state?.orderQty || 0).toLocaleString('en-IN')}
          </span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'var(--color-text-secondary)' }}>
            {fmtDate(q.created_at)}{q.updated_at !== q.created_at ? ` · Updated ${fmtDate(q.updated_at)}` : ''}
          </span>
        </div>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 600, color: '#C8956C' }}>
          {preview.label}
        </span>
      </div>

      {/* Action row */}
      <div className="quotation-actions" style={{
        display: 'flex',
        gap: '6px',
        transition: 'opacity 150ms ease',
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); onLoad(q); }}
          className="shimmer-btn"
          style={{
            flex: 1,
            fontSize: '11px',
            border: 'none',
            color: 'white',
            borderRadius: '8px',
            padding: '6px 0',
            background: 'linear-gradient(135deg, #C8956C 0%, #b8825c 100%)',
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
            transition: 'transform 200ms ease, box-shadow 200ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(200,149,108,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Load
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(q.id); }}
          title="Duplicate"
          className="shimmer-btn"
          style={{
            fontSize: '11px',
            border: '1px solid rgba(200,149,108,0.35)',
            color: 'var(--color-text-secondary)',
            borderRadius: '8px',
            padding: '6px 10px',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 200ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#C8956C';
            e.currentTarget.style.color = '#C8956C';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(200,149,108,0.35)';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <Copy size={12} strokeWidth={1.5} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onExport(q); }}
          title="Export PDF"
          className="shimmer-btn"
          style={{
            fontSize: '11px',
            border: '1px solid rgba(200,149,108,0.35)',
            color: 'var(--color-text-secondary)',
            borderRadius: '8px',
            padding: '6px 10px',
            background: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 200ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#C8956C';
            e.currentTarget.style.color = '#C8956C';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(200,149,108,0.35)';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <Download size={12} strokeWidth={1.5} />
        </button>
      </div>
    </motion.div>
  );
};

/* ─── Main Drawer ─────────────────────────────────────────────────── */
const QuotationHistoryDrawer = ({ isOpen, onClose }) => {
  const {
    selectedClient,
    quotations,
    isLoadingQuotations,
    fetchQuotationsByClient,
    loadQuotation,
    duplicateQuotation,
    deleteQuotation,
  } = useClientStore();

  const [sort, setSort] = useState('newest');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (isOpen && selectedClient) fetchQuotationsByClient(selectedClient.id);
  }, [isOpen, selectedClient, fetchQuotationsByClient]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const sorted = quotations.filter(quote => quote.client_id === selectedClient?.id).sort((a, b) => {
    if (sort === 'newest') return new Date(b.updated_at) - new Date(a.updated_at);
    const aTotal = quotationPreview(a).total || 0;
    const bTotal = quotationPreview(b).total || 0;
    return bTotal - aTotal;
  });

  const handleLoad = (q) => {
    useClientStore.getState().requestTransition(() => doLoad(q));
  };

  const doLoad = (q) => {
    loadQuotation(q);
    onClose();
  };

  const handleDuplicate = async (id) => {
    try { await duplicateQuotation(id); showToast('Duplicate created'); }
    catch (error) { useClientStore.getState().reportError(error); }
  };

  const handleDelete = async (id) => {
    try { await deleteQuotation(id); }
    catch (error) { useClientStore.getState().reportError(error); }
  };

  const handleExport = async q => {
    try {
      const client = useClientStore.getState().clients.find(item => item.id === q.client_id);
      if (!client) throw new Error('The quotation client is unavailable. Reload clients before exporting.');
      await generatePDF({ ...q.state, _quoteNumber: q.quote_number }, client, undefined, q.version);
    } catch (error) { useClientStore.getState().reportError(error); }
  };

  return (
    <>
      <AnimatePresence>
        {toast && <InlineToast key="toast" message={toast} />}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <Dialog label="Quotation history" onClose={onClose}>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 50,
                background: 'rgba(0,0,0,0.22)',
                backdropFilter: 'blur(3px)',
                WebkitBackdropFilter: 'blur(3px)',
              }}
              onClick={onClose}
            />

            {/* Panel */}
            <motion.div
              key="panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 35 }}
              style={{
                position: 'fixed',
                right: 0,
                top: 0,
                bottom: 0,
                width: '420px',
                maxWidth: '100vw',
                zIndex: 51,
                background: 'var(--color-surface)',
                borderLeft: '1px solid var(--color-border)',
                boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* ── Header ── */}
              <div style={{
                padding: '20px 24px 16px',
                borderBottom: '1px solid var(--color-border)',
                flexShrink: 0,
                background: 'var(--color-surface)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: '1.25rem',
                        fontWeight: 500,
                        color: 'var(--color-text-primary)',
                        lineHeight: 1.2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '200px',
                      }}>
                        {selectedClient?.name || 'Client'}
                      </span>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        Quotations
                      </span>
                      <span style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '11px',
                        background: 'rgba(200,149,108,0.12)',
                        color: '#C8956C',
                        padding: '2px 8px',
                        borderRadius: '20px',
                        fontWeight: 500,
                      }}>
                        {quotations.length}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    aria-label="Close quotation history"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-text-secondary)',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '6px',
                      flexShrink: 0,
                      transition: 'all 200ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--color-text-primary)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <X size={18} strokeWidth={1.5} />
                  </button>
                </div>

                {/* Sort pills */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <SortPill label="Newest" active={sort === 'newest'} onClick={() => setSort('newest')} />
                  <SortPill label="Highest Value" active={sort === 'value'} onClick={() => setSort('value')} />
                </div>
              </div>

              {/* ── Cards list ── */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
                {isLoadingQuotations ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      border: '2px solid rgba(200,149,108,0.25)',
                      borderTopColor: '#C8956C',
                      borderRadius: '50%',
                      animation: 'spin 0.7s linear infinite',
                    }} />
                  </div>
                ) : sorted.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '64px 0' }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'rgba(200,149,108,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                    }}>
                      <Package2 size={24} strokeWidth={1.5} style={{ color: '#C8956C' }} />
                    </div>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '17px', color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                      No quotations yet
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      Fill in the calculator and save your first quote.
                    </p>
                  </div>
                ) : (
                  sorted.map((q) => (
                    <QuotationCard
                      key={q.id}
                      quotation={q}
                      onLoad={handleLoad}
                      onDuplicate={handleDuplicate}
                      onDelete={handleDelete}
                      onExport={handleExport}
                    />
                  ))
                )}
              </div>

              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </motion.div>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
};

export default QuotationHistoryDrawer;
