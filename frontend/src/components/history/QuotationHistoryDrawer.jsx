import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Copy, Trash2, RotateCcw, ChevronDown, FileText, Calendar, Hash } from 'lucide-react';
import { getQuotationsByClient, deleteQuotation, duplicateQuotation } from '../../lib/db';
import { generatePDF } from '../../lib/pdf';
import { formatINR, calcAll } from '../../lib/calc';
import useCalculatorStore from '../../store/calculatorStore';
import useClientStore from '../../store/clientStore';

const QuotationCard = ({ quotation, onLoad, onDelete, onDuplicate, onExport }) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const calc = calcAll(quotation.state || {});
  const date = new Date(quotation.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="border border-[var(--border)] rounded-xl p-4 bg-[var(--surface)] hover:border-[var(--copper)] transition-all duration-200 group"
      data-testid={`quotation-card-${quotation.id}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-display font-semibold text-sm text-[var(--text-primary)]">{quotation.job_name || 'Untitled'}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
              <Hash size={10} /> {quotation.quote_number}
            </span>
            <span className="text-xs bg-[var(--border)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded">v{quotation.version}</span>
            {quotation.is_repeat_order && (
              <span className="text-xs bg-[var(--copper)] text-white px-1.5 py-0.5 rounded">Repeat</span>
            )}
          </div>
        </div>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="opacity-0 group-hover:opacity-100 text-[var(--text-secondary)] hover:text-red-500 transition-all p-1"
            data-clickable data-testid={`delete-quote-${quotation.id}`}
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        ) : (
          <div className="flex gap-1">
            <button onClick={() => onDelete(quotation.id)} className="text-xs text-red-500 font-medium px-2 py-1 border border-red-300 rounded" data-clickable>Yes</button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-[var(--text-secondary)] px-2 py-1 border border-[var(--border)] rounded" data-clickable>No</button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-1 text-[var(--text-secondary)]">
          <Calendar size={11} />
          <span>{date}</span>
        </div>
        <span className="text-[var(--copper)] font-semibold tabular-nums">{formatINR(calc.finalTotal)}</span>
      </div>

      <div className="text-xs text-[var(--text-secondary)] mb-3">
        <span>Qty: {quotation.state?.orderQty || 0}</span>
        <span className="mx-2">·</span>
        <span>{quotation.state?.jobName || '—'}</span>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => onLoad(quotation)} className="flex-1 text-xs py-1.5 bg-[var(--copper)] text-white rounded-lg font-medium shimmer-btn hover:-translate-y-0.5 transition-all" data-clickable data-testid={`load-quote-${quotation.id}`}>
          Load
        </button>
        <button onClick={() => onDuplicate(quotation.id)} className="text-xs px-2.5 py-1.5 border border-[var(--border)] rounded-lg hover:border-[var(--copper)] transition-all" data-clickable title="Duplicate" data-testid={`dup-quote-${quotation.id}`}>
          <Copy size={12} strokeWidth={1.5} />
        </button>
        <button onClick={() => onExport(quotation)} className="text-xs px-2.5 py-1.5 border border-[var(--border)] rounded-lg hover:border-[var(--copper)] transition-all" data-clickable title="Export PDF" data-testid={`export-quote-${quotation.id}`}>
          <Download size={12} strokeWidth={1.5} />
        </button>
      </div>
    </motion.div>
  );
};

const QuotationHistoryDrawer = ({ isOpen, onClose }) => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState('newest');
  const { selectedClient } = useClientStore();
  const { loadState, isDirty, getSerializable } = useCalculatorStore();
  const { setCurrentQuotation } = useClientStore();
  const [pendingLoad, setPendingLoad] = useState(null);

  useEffect(() => {
    if (isOpen && selectedClient) loadQuotes();
  }, [isOpen, selectedClient]);

  const loadQuotes = async () => {
    if (!selectedClient) return;
    setLoading(true);
    try {
      const data = await getQuotationsByClient(selectedClient.id);
      setQuotations(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const sorted = [...quotations].sort((a, b) => {
    if (sort === 'newest') return new Date(b.updated_at) - new Date(a.updated_at);
    if (sort === 'value') return calcAll(b.state || {}).finalTotal - calcAll(a.state || {}).finalTotal;
    return 0;
  });

  const handleLoad = (q) => {
    if (isDirty) { setPendingLoad(q); return; }
    doLoad(q);
  };

  const doLoad = (q) => {
    loadState(q.state || {});
    setCurrentQuotation(q);
    setPendingLoad(null);
    onClose();
  };

  const handleDelete = async (id) => {
    await deleteQuotation(id);
    setQuotations(prev => prev.filter(q => q.id !== id));
  };

  const handleDuplicate = async (id) => {
    const copy = await duplicateQuotation(id);
    setQuotations(prev => [copy, ...prev]);
  };

  const handleExport = (q) => generatePDF(q.state || {}, selectedClient);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-[420px] max-w-full z-50 bg-[var(--surface)] border-l border-[var(--border)] flex flex-col shadow-2xl"
            data-testid="history-drawer"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
              <div>
                <h3 className="font-display font-semibold text-[var(--text-primary)]">Quote History</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{selectedClient?.name} · {quotations.length} quotes</p>
              </div>
              <div className="flex items-center gap-3">
                <select value={sort} onChange={e => setSort(e.target.value)} className="input-copper text-xs px-2 py-1.5 rounded-lg" data-testid="history-sort">
                  <option value="newest">Newest First</option>
                  <option value="value">Highest Value</option>
                </select>
                <button onClick={onClose} className="p-2 hover:bg-[var(--bg)] rounded-lg transition-colors" data-clickable data-testid="close-history">
                  <X size={18} strokeWidth={1.5} className="text-[var(--text-secondary)]" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-[var(--text-secondary)]">
                  <div className="w-6 h-6 border-2 border-[var(--copper)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : sorted.length === 0 ? (
                <div className="text-center py-16 text-[var(--text-secondary)]">
                  <FileText size={40} strokeWidth={1} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No quotations yet.</p>
                  <p className="text-xs mt-1">Fill in the calculator and save your first quote.</p>
                </div>
              ) : (
                sorted.map(q => (
                  <QuotationCard
                    key={q.id}
                    quotation={q}
                    onLoad={handleLoad}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    onExport={handleExport}
                  />
                ))
              )}
            </div>

            {/* Unsaved changes confirm */}
            <AnimatePresence>
              {pendingLoad && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                  className="absolute inset-x-0 bottom-0 bg-[var(--surface)] border-t border-[var(--border)] p-5 shadow-xl"
                >
                  <p className="text-sm font-medium text-[var(--text-primary)] mb-1">You have unsaved changes.</p>
                  <p className="text-xs text-[var(--text-secondary)] mb-4">Load anyway? Your current work will be lost.</p>
                  <div className="flex gap-3">
                    <button onClick={() => doLoad(pendingLoad)} className="flex-1 py-2 text-sm bg-[var(--copper)] text-white rounded-lg font-medium" data-clickable>Load Anyway</button>
                    <button onClick={() => setPendingLoad(null)} className="flex-1 py-2 text-sm border border-[var(--border)] rounded-lg" data-clickable>Cancel</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default QuotationHistoryDrawer;
