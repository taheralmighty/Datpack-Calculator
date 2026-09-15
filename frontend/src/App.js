import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import Dialog from './components/ui/Dialog';

// Layout
import CustomCursor from './components/cursor/CustomCursor';
import AppHeader from './components/layout/AppHeader';
import Sidebar from './components/layout/Sidebar';
import SummaryBar from './components/layout/SummaryBar';

// Sections
import JobSpecs from './components/sections/Section1_JobSpecs';
import PaperSpecs from './components/sections/Section2_PaperSpecs';
import PaperCost from './components/sections/Section3_PaperCost';
import Printing from './components/sections/Section4_Printing';
import Lamination from './components/sections/Section5_Lamination';
import Foiling from './components/sections/Section6_Foiling';
import UV from './components/sections/Section7_UV';
import DieCutting from './components/sections/Section8_DieCutting';
import Pasting from './components/sections/Section9_Pasting';
import Summary from './components/sections/Section10_Summary';

// Client + History
import ClientSelectionModal from './components/clients/ClientSelectionModal';
import QuotationHistoryDrawer from './components/history/QuotationHistoryDrawer';

// Store + Lib
import useCalculatorStore from './store/calculatorStore';
import useClientStore from './store/clientStore';
import { calcAll } from './lib/calc';
import { generatePDF } from './lib/pdf';
import { exportCSV } from './lib/csv';
import { assertExportable, validateQuote } from './lib/validation';
import CalculatedEditableField from './components/ui/CalculatedEditableField';

// ─── Completion Helper ─────────────────────────────────
const getCompletion = (fields) => {
  const vals = fields.filter(f => f !== '' && f !== null && f !== undefined && f !== '0' && f !== 0);
  if (vals.length === 0) return 'empty';
  if (vals.length === fields.length) return 'complete';
  return 'partial';
};

// ─── Confirm Modal ─────────────────────────────────────
const ConfirmModal = ({ busy, onSave, onDiscard, onCancel }) => (
  <Dialog label="Unsaved quotation" onClose={busy ? undefined : onCancel}>
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }}
        className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
        data-testid="confirm-modal"
      >
        <p className="text-sm text-[var(--text-primary)] mb-5">Save your changes before continuing?</p>
        <div className="flex gap-3">
          <button disabled={busy} onClick={onSave} className="flex-1 py-2.5 bg-[var(--copper)] text-white text-sm rounded-lg font-medium">{busy ? 'Saving...' : 'Save'}</button>
          <button disabled={busy} onClick={onDiscard} className="flex-1 py-2.5 border border-[var(--border)] text-sm rounded-lg">Discard</button>
          <button disabled={busy} onClick={onCancel} className="flex-1 py-2.5 border border-[var(--border)] text-sm rounded-lg" data-testid="confirm-no">Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  </Dialog>
);

// ─── Main App ──────────────────────────────────────────
function AppInner() {
  const [activeSection, setActiveSection] = useState('section-1');

  const calcStore = useCalculatorStore();
  const clientStore = useClientStore();
  const calc = calcAll(calcStore);
  const validation = validateQuote(calcStore);

  // Bind modal/history to clientStore so ClientSelectionModal and App stay in sync
  const isClientModalOpen = clientStore.isClientModalOpen;
  const isHistoryOpen = clientStore.isHistoryOpen;
  const setClientModalOpen = clientStore.setClientModalOpen;
  const setHistoryOpen = clientStore.setHistoryOpen;

  // ── Auto-save ─────────────────────────────────────────
  useEffect(() => {
    if (!calcStore.isDirty || !clientStore.selectedClient || clientStore.saveError || clientStore.pendingTransition) return;
    const timer = setTimeout(() => useClientStore.getState().saveCurrentQuotation().catch(() => {}), 3000);
    return () => clearTimeout(timer);
  }, [calcStore.editRevision, calcStore.isDirty, clientStore.sessionId, clientStore.selectedClient, clientStore.saveError, clientStore.pendingTransition]);

  useEffect(() => {
    const retry = () => useClientStore.getState().retryConnection();
    const timer = setInterval(retry, 15000);
    window.addEventListener('online', retry);
    return () => { clearInterval(timer); window.removeEventListener('online', retry); };
  }, []);

  useEffect(() => {
    const warn = event => {
      if (!useCalculatorStore.getState().isDirty) return;
      useClientStore.getState().persistDraft();
      event.preventDefault(); event.returnValue = '';
    };
    const persist = () => useClientStore.getState().persistDraft();
    window.addEventListener('beforeunload', warn);
    window.addEventListener('pagehide', persist);
    document.addEventListener('visibilitychange', persist);
    return () => {
      window.removeEventListener('beforeunload', warn);
      window.removeEventListener('pagehide', persist);
      document.removeEventListener('visibilitychange', persist);
    };
  }, []);

  const handleNewQuote = () => clientStore.requestTransition(clientStore.newQuote);
  const handleSwitchClient = () => setClientModalOpen(true);

  const handleExport = async format => {
    if (useClientStore.getState().exportBusy) return;
    useClientStore.setState({ exportBusy: true, actionError: null });
    try {
      assertExportable(calcStore.getSerializable());
      if (!useCalculatorStore.getState().issuedAt) calcStore.setField('issuedAt', new Date().toISOString());
      if (!useCalculatorStore.getState().issueSnapshot) {
        const state = calcStore.getSerializable();
        calcStore.setField('issueSnapshot', { state: { ...state, issueSnapshot: null }, calc: calcAll(state), capturedAt: new Date().toISOString() });
      }
      const captured = clientStore.captureSnapshot();
      assertExportable(captured.state);
      const client = { ...clientStore.selectedClient };
      const saved = await clientStore.saveCurrentQuotation(captured);
      if (format === 'pdf') await generatePDF(saved.state, client, undefined, saved.version);
      else exportCSV(saved.state, saved.version);
    } catch (error) { clientStore.reportError(error); }
    finally { useClientStore.setState({ exportBusy: false }); }
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
    Array.from({ length: 10 }, (_, index) => `section-${index + 1}`).forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isClientModalOpen]);

  // ── Completion States ─────────────────────────────────
  const completions = {
    'section-1': getCompletion([calcStore.clientName, calcStore.jobName, calcStore.orderQty, calc.upsPerSheet]),
    'section-2': getCompletion([calcStore.masterLength, calcStore.masterWidth, calcStore.gsm, calcStore.paperRate]),
    'section-3': getCompletion([calc.netSheets, calc.grossSheets, calc.totalPaperCost]),
    'section-4': getCompletion([calcStore.machineSize]),
    'section-5': calcStore.laminationType ? getCompletion([calcStore.laminationType]) : 'complete',
    'section-6': calcStore.foilingSize ? getCompletion([calcStore.foilingSize]) : 'complete',
    'section-7': calcStore.uvType ? getCompletion([calcStore.uvType]) : 'complete',
    'section-8': getCompletion([calcStore.machineSize]),
    'section-9': calcStore.pastingType ? getCompletion([calcStore.pastingType]) : 'complete',
    'section-10': validation.status === 'exportable' ? 'complete' : 'partial',
  };

  return (
    <div className="min-h-screen transition-colors duration-300">
      {!isClientModalOpen && !isHistoryOpen && !clientStore.pendingTransition && !clientStore.transitionBusy &&
        (clientStore.actionError || clientStore.saveError || clientStore.recoveryError || calcStore.validationError) && (
        <div role="alert" className="fixed top-16 left-4 right-4 p-3 rounded-lg border border-red-400 bg-[var(--surface)] text-[var(--text-primary)] text-sm" style={{ zIndex: 250 }}>
          {clientStore.recoveryError || clientStore.saveError || clientStore.actionError || calcStore.validationError}
          {clientStore.saveError && <button className="ml-4 underline" onClick={() => clientStore.saveCurrentQuotation().catch(() => {})}>Retry Save</button>}
          {clientStore.actionError && <button className="ml-4 underline" onClick={() => { clientStore.clearError(); clientStore.fetchClients(); }}>Reload Clients</button>}
          <button aria-label="Dismiss error" className="ml-4 underline" onClick={() => { clientStore.clearError(); useCalculatorStore.setState({ validationError: null }); }}>Dismiss</button>
        </div>
      )}

      {/* Main App — renders whenever a client is selected */}
      {clientStore.selectedClient && (
        <>
          <AppHeader
            onHistory={() => setHistoryOpen(true)}
            onSwitchClient={handleSwitchClient}
            onNewQuote={handleNewQuote}
          />
          <Sidebar
            activeSection={parseInt(activeSection.replace('section-', ''), 10)}
            onSectionClick={(id) => {
              setActiveSection(`section-${id}`);
              const el = document.getElementById(`section-${id}`);
              if (el) {
                const top = el.getBoundingClientRect().top + window.scrollY - 72;
                window.scrollTo({ top, behavior: 'smooth' });
              }
            }}
            sectionCompletion={{
              1: completions['section-1'],
              2: completions['section-2'],
              3: completions['section-3'],
              4: completions['section-4'],
              5: completions['section-5'],
              6: completions['section-6'],
              7: completions['section-7'],
              8: completions['section-8'],
              9: completions['section-9'],
              10: completions['section-10'],
            }}
            sectionSubtotals={{
              3: calc.paperCost,
              10: calc.finalTotal,
            }}
          />

          <main className="lg:ml-[240px] pt-14 pb-20 min-h-screen">
            <div className="max-w-3xl mx-auto px-4 py-8">
              {validation.status !== 'exportable' && <div role="status" className="mb-4 text-sm text-[var(--text-secondary)]">
                {validation.status === 'invalid' ? 'Invalid quotation' : 'Incomplete draft'}: {validation.messages.join(' ')}
              </div>}
              {calcStore.migrationReview?.required && <div className="mb-4 p-4 border border-[var(--border)] rounded-lg text-sm">
                <p>{calcStore.migrationReview.message}</p>
                <p>Percentage format: {calcStore.migrationReview.percentageFormat}. Select the current machine and finishes as needed.</p>
                {calcStore.migrationReview.pendingWeightOverride != null && <div className="my-2">
                  <p>A previously ignored Total Paper Weight override ({String(calcStore.migrationReview.pendingWeightOverride)} kg) was preserved but not activated.</p>
                  <button className="mr-4 underline" onClick={() => {
                    calcStore.setOverride('totalPaperWeight', calcStore.migrationReview.pendingWeightOverride);
                    calcStore.setField('migrationReview', { ...calcStore.migrationReview, pendingWeightOverride: null });
                  }}>Use weight override</button>
                  <button className="underline" onClick={() => calcStore.setField('migrationReview', { ...calcStore.migrationReview, pendingWeightOverride: null })}>Keep calculated weight</button>
                </div>}
                <button disabled={calcStore.migrationReview.pendingWeightOverride != null} className="mt-2 underline" onClick={() => {
                  clientStore.setCurrentQuotation(null);
                  calcStore.setField('issuedAt', null);
                  calcStore.setField('issueSnapshot', null);
                  calcStore.setField('migrationReview', { ...calcStore.migrationReview, required: false, acknowledgedAt: new Date().toISOString() });
                  calcStore.setField('revisedAt', new Date().toISOString());
                }}>I reviewed the inputs; create a revised quotation</button>
              </div>}
              {['weightPerSheet', 'totalPaperWeight'].filter(key => calcStore.overrides[key] != null).map(key => (
                <div key={key} className="mb-4 p-3 border border-[var(--border)] rounded-lg">
                  <p className="text-xs">Paper pricing is controlled by a legacy weight override.</p>
                  <CalculatedEditableField label={key === 'weightPerSheet' ? 'Weight per Sheet (kg)' : 'Total Paper Weight (kg)'}
                    calculatedValue={calc[key]} overrideValue={calcStore.overrides[key]}
                    onOverride={value => calcStore.setOverride(key, value)} onReset={() => calcStore.clearOverride(key)}
                    formulaTooltip={key === 'weightPerSheet' ? 'Master Sheet Length × Master Sheet Width × GSM ÷ 1,550,000' : 'Gross Sheets × Weight per Sheet'} />
                </div>
              ))}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <JobSpecs completion={completions['section-1']} />
                <PaperSpecs completion={completions['section-2']} />
                <PaperCost completion={completions['section-3']} calc={calc} />
                <Printing completion={completions['section-4']} calc={calc} />
                <Lamination completion={completions['section-5']} calc={calc} />
                <Foiling completion={completions['section-6']} calc={calc} />
                <UV completion={completions['section-7']} calc={calc} />
                <DieCutting completion={completions['section-8']} calc={calc} />
                <Pasting completion={completions['section-9']} calc={calc} />
                <Summary completion={completions['section-10']} calc={calc} />
              </motion.div>
            </div>
          </main>

          <SummaryBar
            calc={calc}
            onExportPDF={() => handleExport('pdf')}
            onExportCSV={() => handleExport('csv')}
          />

          <QuotationHistoryDrawer
            isOpen={isHistoryOpen}
            onClose={() => setHistoryOpen(false)}
          />
        </>
      )}

      {/* Client Selection Modal — overlays on top, controlled by store */}
      <AnimatePresence>
        {isClientModalOpen && <ClientSelectionModal />}
      </AnimatePresence>

      {/* Confirm New Quote Modal */}
      {clientStore.pendingTransition && (
        <ConfirmModal
          busy={clientStore.transitionBusy}
          onSave={() => clientStore.resolveTransition('save')}
          onDiscard={() => clientStore.resolveTransition('discard')}
          onCancel={() => clientStore.resolveTransition('cancel')}
        />
      )}
      {clientStore.transitionBusy && !clientStore.pendingTransition && (
        <Dialog label="Opening quotation" className="flex items-center justify-center bg-black/30">
          <div role="status" className="p-4 rounded-lg bg-[var(--surface)] text-[var(--text-primary)]">Opening quotation...</div>
        </Dialog>
      )}

      {/* Custom cursor rendered last so it paints above all modals/overlays */}
      <CustomCursor />
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppInner />
    </MotionConfig>
  );
}
