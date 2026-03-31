import React, { useEffect, useState, useCallback, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';

// Layout
import CustomCursor from './components/cursor/CustomCursor';
import AppHeader from './components/layout/AppHeader';
import Sidebar from './components/layout/Sidebar';
import SummaryBar from './components/layout/SummaryBar';

// Sections
import Section1 from './components/sections/Section1_JobSpecs';
import Section2 from './components/sections/Section2_PaperSpecs';
import Section3 from './components/sections/Section3_Layout';
import Section4 from './components/sections/Section4_PaperCost';
import Section5 from './components/sections/Section5_Printing';
import Section6 from './components/sections/Section6_Finishes';
import Section7 from './components/sections/Section7_Finishing';
import Section8 from './components/sections/Section8_Summary';
import Section9 from './components/sections/Section9_RepeatOrder';

// Client + History
import ClientSelectionModal from './components/clients/ClientSelectionModal';
import QuotationHistoryDrawer from './components/history/QuotationHistoryDrawer';

// Store + Lib
import useCalculatorStore from './store/calculatorStore';
import useClientStore from './store/clientStore';
import { calcAll, generateQuoteNumber } from './lib/calc';
import { saveQuotation } from './lib/db';
import { generatePDF } from './lib/pdf';
import { exportCSV } from './lib/csv';

const queryClient = new QueryClient();

// ─── Completion Helper ─────────────────────────────────
const getCompletion = (fields) => {
  const vals = fields.filter(f => f !== '' && f !== null && f !== undefined && f !== '0' && f !== 0);
  if (vals.length === 0) return 'empty';
  if (vals.length === fields.length) return 'complete';
  return 'partial';
};

// ─── Confirm Modal ─────────────────────────────────────
const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }}
        className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
        data-testid="confirm-modal"
      >
        <p className="text-sm text-[var(--text-primary)] mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-[var(--copper)] text-white text-sm rounded-lg font-medium" data-clickable data-testid="confirm-yes">Confirm</button>
          <button onClick={onCancel} className="flex-1 py-2.5 border border-[var(--border)] text-sm rounded-lg" data-clickable data-testid="confirm-no">Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

// ─── Toast ─────────────────────────────────────────────
const Toast = ({ message, type = 'info' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl z-50 ${
      type === 'error' ? 'bg-red-500 text-white' : 'bg-[#1A1A1A] text-white'
    }`}
    data-testid="toast"
  >
    {message}
  </motion.div>
);

// ─── Main App ──────────────────────────────────────────
function AppInner() {
  const [darkMode, setDarkMode] = useState(false);
  const [showClientModal, setShowClientModal] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeSection, setActiveSection] = useState('section-1');
  const saveTimerRef = useRef(null);

  const calcStore = useCalculatorStore();
  const clientStore = useClientStore();
  const calc = calcAll(calcStore);

  const showToast = (msg, type = 'info') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Dark mode ─────────────────────────────────────────
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // ── Auto-save ─────────────────────────────────────────
  useEffect(() => {
    if (!calcStore.isDirty || !clientStore.selectedClient) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doAutoSave(), 3000);
    return () => clearTimeout(saveTimerRef.current);
  }, [calcStore.isDirty, calcStore.getSerializable()]);

  const doAutoSave = useCallback(async () => {
    if (!clientStore.selectedClient) return;
    clientStore.setSaving(true);
    try {
      const state = calcStore.getSerializable();
      const qNum = clientStore.currentQuoteNumber || generateQuoteNumber();
      const payload = {
        id: clientStore.currentQuotationId || undefined,
        client_id: clientStore.selectedClient.id,
        job_name: state.jobName || 'Untitled',
        quote_number: qNum,
        version: clientStore.currentVersion,
        is_repeat_order: state.isRepeatOrder || false,
        state: { ...state, _quoteNumber: qNum },
      };
      const saved = await saveQuotation(payload);
      clientStore.setCurrentQuotation(saved);
      clientStore.setLastSaved(saved.updated_at);
      calcStore.markClean();
    } catch (e) {
      showToast('Save failed — retrying...', 'error');
    } finally {
      clientStore.setSaving(false);
    }
  }, [calcStore, clientStore]);

  // ── Save Snapshot ─────────────────────────────────────
  const handleSaveSnapshot = async () => {
    if (!clientStore.selectedClient) { showToast('Select a client first'); return; }
    clientStore.setSaving(true);
    try {
      const state = calcStore.getSerializable();
      const qNum = clientStore.currentQuoteNumber || generateQuoteNumber();
      const nextVersion = clientStore.currentVersion + 1;
      const payload = {
        client_id: clientStore.selectedClient.id,
        job_name: state.jobName || 'Untitled',
        quote_number: qNum,
        version: nextVersion,
        is_repeat_order: state.isRepeatOrder || false,
        state: { ...state, _quoteNumber: qNum },
      };
      const saved = await saveQuotation(payload);
      clientStore.setCurrentQuotation(saved);
      clientStore.setLastSaved(saved.updated_at);
      calcStore.markClean();
      showToast(`Snapshot v${nextVersion} saved`);
    } catch (e) {
      showToast('Snapshot failed', 'error');
    } finally {
      clientStore.setSaving(false);
    }
  };

  // ── Client Selection ──────────────────────────────────
  const handleClientSelect = (client, quotation, openHistory = false) => {
    clientStore.setClient(client);
    if (quotation) {
      calcStore.loadState(quotation.state || {});
      clientStore.setCurrentQuotation(quotation);
    } else {
      calcStore.resetCalculator();
      calcStore.setField('clientName', client.name);
    }
    setShowClientModal(false);
    if (openHistory) setShowHistory(true);
  };

  // ── New Quote ─────────────────────────────────────────
  const handleNewQuote = () => {
    if (calcStore.isDirty) { setConfirmNew(true); return; }
    doNewQuote();
  };

  const doNewQuote = () => {
    calcStore.resetCalculator();
    if (clientStore.selectedClient) calcStore.setField('clientName', clientStore.selectedClient.name);
    clientStore.setCurrentQuotation(null);
    setConfirmNew(false);
  };

  // ── PDF Export ────────────────────────────────────────
  const handleExportPDF = async () => {
    const state = calcStore.getSerializable();
    const qNum = clientStore.currentQuoteNumber || generateQuoteNumber();
    generatePDF({ ...state, _quoteNumber: qNum }, clientStore.selectedClient);
    // Tag save with PDF Generated
    if (clientStore.selectedClient) {
      await doAutoSave();
    }
  };

  // ── CSV Export ────────────────────────────────────────
  const handleExportCSV = () => {
    const state = calcStore.getSerializable();
    exportCSV({ ...state, _quoteNumber: clientStore.currentQuoteNumber });
  };

  // ── Section scroll spy ────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    ['section-1','section-2','section-3','section-4','section-5','section-6','section-7','section-8','section-9'].forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [showClientModal]);

  // ── Completion States ─────────────────────────────────
  const completions = {
    'section-1': getCompletion([calcStore.clientName, calcStore.jobName, calcStore.orderQty, calcStore.flatLength, calcStore.flatWidth]),
    'section-2': getCompletion([calcStore.masterLength, calcStore.masterWidth, calcStore.gsm]),
    'section-3': getCompletion([calc.upsPerSheet, calc.netSheets, calc.grossSheets]),
    'section-4': getCompletion([calcStore.paperRate, calc.paperCost]),
    'section-5': getCompletion([calcStore.clickCharge]),
    'section-6': getCompletion([calcStore.foilingRunRate || calcStore.uvRunRate || 0]),
    'section-7': getCompletion([calcStore.punchingRate || calcStore.pastingRate || 0]),
    'section-8': getCompletion([calcStore.margin, calcStore.gst, calc.finalTotal]),
    'section-9': getCompletion([calcStore.isRepeatOrder ? 1 : 0]),
  };

  return (
    <div className={`min-h-screen bg-[var(--bg)] transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      <CustomCursor />

      {/* Client Selection Modal */}
      <ClientSelectionModal
        isOpen={showClientModal}
        onSelect={handleClientSelect}
      />

      {/* Main App (when client selected) */}
      {!showClientModal && (
        <>
          <AppHeader
            onHistory={() => setShowHistory(true)}
            onSwitchClient={() => setShowClientModal(true)}
            onNewQuote={handleNewQuote}
            darkMode={darkMode}
            onToggleDark={() => setDarkMode(!darkMode)}
          />
          <Sidebar activeSection={activeSection} completions={completions} calc={calc} />

          <main className="lg:ml-[240px] pt-14 pb-20 min-h-screen">
            <div className="max-w-3xl mx-auto px-4 py-8">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Section1 completion={completions['section-1']} />
                <Section2 completion={completions['section-2']} />
                <Section3 completion={completions['section-3']} calc={calc} />
                <Section4 completion={completions['section-4']} calc={calc} />
                <Section5 completion={completions['section-5']} calc={calc} />
                <Section6 completion={completions['section-6']} calc={calc} />
                <Section7 completion={completions['section-7']} calc={calc} />
                <Section8 completion={completions['section-8']} calc={calc} />
                <Section9 completion={completions['section-9']} calc={calc} />
              </motion.div>
            </div>
          </main>

          <SummaryBar
            calc={calc}
            onExportPDF={handleExportPDF}
            onExportCSV={handleExportCSV}
            onSaveSnapshot={handleSaveSnapshot}
          />

          <QuotationHistoryDrawer
            isOpen={showHistory}
            onClose={() => setShowHistory(false)}
          />
        </>
      )}

      {/* Confirm New Quote Modal */}
      {confirmNew && (
        <ConfirmModal
          message="You have unsaved changes. Start a new quote anyway? Current work will be lost."
          onConfirm={doNewQuote}
          onCancel={() => setConfirmNew(false)}
        />
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast key="toast" message={toast.message} type={toast.type} />}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}
