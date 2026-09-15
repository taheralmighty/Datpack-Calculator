import { create } from 'zustand';
import * as db from '../lib/db';
import useCalculatorStore from './calculatorStore';
import { migrateState, generateQuoteNumber } from '../lib/calc';
import { createSaveCoordinator } from '../lib/saveCoordinator';
import { getDrafts, storeDraft, removeDraft } from '../lib/drafts';
import { validateQuote } from '../lib/validation';
import { isTemporaryConnectionError } from '../lib/persistenceErrors';

const coordinator = createSaveCoordinator(db, {
  onPending: (captured, pendingWrite) => {
    try {
      const active = useClientStore.getState();
      const draft = getDrafts().find(item => item.id === captured.id);
      if (draft) storeDraft({ ...draft, pendingWrite });
      else if (active.currentQuotationId === captured.id) storeDraft({ ...captured, client: active.selectedClient, pendingWrite, updated_at: new Date().toISOString() });
    } catch (error) { useClientStore.setState({ recoveryError: error.message }); }
  },
  onAcknowledged: (captured, saved) => {
    try {
      const draft = getDrafts().find(item => item.id === captured.id);
      if (draft) storeDraft({ ...draft, expectedRevision: saved.revision, pendingWrite: null });
    } catch (error) { useClientStore.setState({ recoveryError: error.message }); }
  },
});
let nextSession = 0;
let historyRequest = 0;
const mutationRequests = new Map();

const useClientStore = create((set, get) => ({
  // ─── State ────────────────────────────────────────
  clients: [],
  selectedClient: null,
  quotations: [],
  allQuotations: [],
  currentQuotation: null,
  isLoadingClients: false,
  clientsLoadError: null,
  quotationsLoadError: null,
  isLoadingQuotations: false,
  isHistoryOpen: false,
  isClientModalOpen: true,

  // ─── Legacy state fields (used by App.js) ─────────
  currentQuotationId: null,
  currentQuoteNumber: null,
  currentVersion: 1,
  isSaving: false,
  savingRevision: null,
  issuingQuotationId: null,
  lastSavedAt: null,
  sessionId: ++nextSession,
  saveError: null,
  saveRetryable: false,
  loadRetryable: false,
  actionError: null,
  recoveryError: null,
  recoveryDrafts: [],
  pendingTransition: null,
  transitionBusy: false,
  exportBusy: false,

  clearError: () => set({ actionError: null, ...(get().saveRetryable ? {} : { saveError: null }) }),
  retryConnection: async () => {
    if (get().transitionBusy || get().pendingTransition || get().isSaving) return;
    if (get().loadRetryable && !get().isLoadingClients) await get().fetchClients();
    if (get().saveRetryable && useCalculatorStore.getState().isDirty) await get().saveCurrentQuotation().catch(() => {});
  },
  reportError: error => set({ actionError: error.message || String(error) }),
  requestTransition: (action) => {
    if (get().pendingTransition || get().transitionBusy) return;
    if (useCalculatorStore.getState().isDirty || get().isSaving) {
      set({ pendingTransition: { action, focus: document.activeElement }, actionError: null });
    } else {
      set({ transitionBusy: true });
      Promise.resolve().then(action).catch(get().reportError).finally(() => set({ transitionBusy: false }));
    }
  },
  resolveTransition: async decision => {
    const pending = get().pendingTransition;
    if (!pending || get().transitionBusy) return;
    if (decision === 'cancel') {
      set({ pendingTransition: null });
      pending.focus?.focus?.();
      return;
    }
    const sessionId = get().sessionId;
    const revision = useCalculatorStore.getState().editRevision;
    set({ transitionBusy: true, actionError: null });
    try {
      if (decision === 'save') await get().saveCurrentQuotation();
      if (get().sessionId !== sessionId || useCalculatorStore.getState().editRevision !== revision) {
        throw new Error('The quotation changed while saving. Review your changes before continuing.');
      }
      if (get().currentQuotationId) removeDraft(get().currentQuotationId);
      set({ pendingTransition: null });
      await pending.action();
    } catch (error) { get().reportError(error); }
    finally { set({ transitionBusy: false }); }
  },
  newQuote: () => {
    get().setCurrentQuotation(null);
    useCalculatorStore.getState().loadState({ ...migrateState(null), clientName: get().selectedClient?.name || '' });
  },
  captureSnapshot: () => {
    const active = get();
    if (!active.selectedClient) throw new Error('Select a client first.');
    if (!active.currentQuotationId) {
      set({ currentQuotationId: crypto.randomUUID(), currentQuoteNumber: active.currentQuoteNumber || generateQuoteNumber() });
    }
    if (!get().currentQuoteNumber) set({ currentQuoteNumber: generateQuoteNumber() });
    const current = get();
    if (coordinator.isRetired(current.currentQuotationId)) throw new Error('This quotation is being deleted. Start a new quotation.');
    let draft;
    try { draft = getDrafts().find(item => item.id === current.currentQuotationId); }
    catch (error) { set({ recoveryError: error.message }); }
    return JSON.parse(JSON.stringify({
      id: current.currentQuotationId, client_id: current.selectedClient.id,
      quote_number: current.currentQuoteNumber, version: current.currentVersion,
      sessionId: current.sessionId, editRevision: useCalculatorStore.getState().editRevision,
      expectedRevision: draft?.expectedRevision ?? current.currentQuotation?.revision ?? 0,
      ...(draft?.pendingWrite ? { pendingWrite: draft.pendingWrite } : {}),
      job_name: useCalculatorStore.getState().jobName || 'Untitled',
      state: { ...useCalculatorStore.getState().getSerializable(), _quoteNumber: current.currentQuoteNumber },
    }));
  },
  persistDraft: () => {
    if (!useCalculatorStore.getState().isDirty || !get().selectedClient) return;
    try {
      storeDraft({ ...get().captureSnapshot(), client: get().selectedClient, updated_at: new Date().toISOString() });
      if (get().recoveryError) set({ recoveryError: null });
    } catch (error) { set({ recoveryError: error.message }); }
  },
  refreshRecovery: () => {
    try { set({ recoveryDrafts: getDrafts(), recoveryError: null }); }
    catch (error) { set({ recoveryError: error.message }); }
  },
  recoverDraft: draft => {
    const client = get().clients.find(item => item.id === draft.client_id) || (get().loadRetryable ? draft.client : null);
    if (!client || draft.client?.id !== client.id) throw new Error('The recovered draft client is unavailable. Restore its client record first.');
    get().selectClient(client);
    get().loadQuotation({ id: draft.id, client_id: client.id, quote_number: draft.quote_number, version: draft.version,
      revision: draft.expectedRevision, state: draft.state });
    useCalculatorStore.setState(state => ({ isDirty: true, editRevision: state.editRevision + 1 }));
    set({ isClientModalOpen: false, recoveryDrafts: get().recoveryDrafts.filter(item => item.id !== draft.id) });
  },
  discardRecovery: id => {
    try { removeDraft(id); get().refreshRecovery(); }
    catch (error) { get().reportError(error); }
  },

  // ─── New Actions ──────────────────────────────────

  fetchClients: async () => {
    get().refreshRecovery();
    const previousError = get().loadRetryable ? get().actionError : get().clientsLoadError;
    set({ isLoadingClients: true, clientsLoadError: null });
    try {
      const clients = await db.getClients();
      set({ clients: clients || [], loadRetryable: false,
        ...(get().actionError === previousError ? { actionError: null } : {}) });
      await get().fetchAllQuotations();
      get().refreshRecovery();
    } catch (err) {
      set({ clientsLoadError: err.message || String(err), loadRetryable: isTemporaryConnectionError(err) });
      get().reportError(err);
    } finally {
      set({ isLoadingClients: false });
    }
  },

  fetchAllQuotations: async () => {
    const previousError = get().quotationsLoadError;
    set({ quotationsLoadError: null });
    try {
      const allQuotations = await db.getAllQuotations();
      set({ allQuotations: allQuotations || [], ...(get().actionError === previousError ? { actionError: null } : {}) });
    } catch (err) {
      set({ quotationsLoadError: err.message || String(err), loadRetryable: isTemporaryConnectionError(err) });
      get().reportError(err);
    }
  },

  selectClient: (client) => {
    if (get().selectedClient?.id !== client.id) {
      historyRequest++;
      set({ selectedClient: client, quotations: [], isLoadingQuotations: false });
      get().setCurrentQuotation(null);
      useCalculatorStore.getState().resetCalculator();
      useCalculatorStore.getState().loadState({ ...useCalculatorStore.getState().getSerializable(), clientName: client.name });
    }
    set({ selectedClient: client });
    get().fetchQuotationsByClient(client.id);
  },

  fetchQuotationsByClient: async (clientId) => {
    const request = ++historyRequest;
    set({ isLoadingQuotations: true });
    try {
      const quotations = await db.getQuotationsByClient(clientId);
      if (request === historyRequest && get().selectedClient?.id === clientId) {
        set({ quotations: (quotations || []).filter(quote => quote.client_id === clientId) });
      }
    } catch (err) {
      if (request === historyRequest) {
        if (isTemporaryConnectionError(err)) set({ loadRetryable: true });
        get().reportError(err);
      }
    } finally {
      if (request === historyRequest) set({ isLoadingQuotations: false });
    }
  },

  createNewClient: async (data) => {
    try {
      const client = await db.createClient(data);
      useCalculatorStore.getState().resetCalculator();
      useCalculatorStore.getState().loadState({ ...useCalculatorStore.getState().getSerializable(), clientName: client.name });
      get().setCurrentQuotation(null);
      set((s) => ({
        clients: [client, ...s.clients],
        selectedClient: client,
        isClientModalOpen: false,
      }));
      return client;
    } catch (err) {
      console.error('[clientStore] createNewClient error:', err);
      throw err;
    }
  },

  saveCurrentQuotation: async (snapshot) => {
    if (snapshot?.sessionId == null) {
      const currentValidation = validateQuote(useCalculatorStore.getState().getSerializable());
      if (currentValidation.status === 'invalid') {
        const error = new Error(currentValidation.messages.join(' '));
        set({ saveError: error.message, saveRetryable: false });
        throw error;
      }
    }
    const captured = snapshot?.sessionId != null ? snapshot : get().captureSnapshot();
    const isActive = () => get().sessionId === captured.sessionId && get().currentQuotationId === captured.id && get().selectedClient?.id === captured.client_id;
    if (isActive() && !useCalculatorStore.getState().isDirty && get().currentQuotation?.state?.issueSnapshot &&
      JSON.stringify(get().currentQuotation.state) === JSON.stringify(captured.state)) return JSON.parse(JSON.stringify(get().currentQuotation));
    if (isActive()) set({ isSaving: true, savingRevision: captured.editRevision, saveError: null, saveRetryable: false,
      ...(captured.state.issueSnapshot ? { issuingQuotationId: captured.id } : {}) });
    try {
      if (captured.state.migrationReview?.required) throw new Error('Review the legacy quotation and create a revised draft before saving. The original remains unchanged.');
      const validation = validateQuote(captured.state);
      if (validation.status === 'invalid') throw new Error(validation.messages.join(' '));
      const saved = await coordinator.save(captured);
      if (isActive() && !coordinator.isRetired(captured.id)) {
        set({ currentQuotation: saved, lastSavedAt: saved.updated_at,
          ...(get().savingRevision === captured.editRevision ? { isSaving: false, savingRevision: null, saveError: null } : {}) });
        useCalculatorStore.getState().markClean(captured.editRevision);
        if (useCalculatorStore.getState().isDirty) get().persistDraft();
      }
      try { removeDraft(captured.id, captured.editRevision); } catch (error) { set({ recoveryError: error.message }); }
      await get().refreshCaches();
      return saved;
    } catch (err) {
      if (isActive() && get().savingRevision === captured.editRevision) {
        const retryable = isTemporaryConnectionError(err);
        get().persistDraft();
        set({ isSaving: false, savingRevision: null, saveRetryable: retryable,
          saveError: retryable && !get().recoveryError
            ? `Connection unavailable - changes saved on this device and will retry. ${err.message}` : err.message });
      }
      throw err;
    } finally {
      if (get().issuingQuotationId === captured.id) set({ issuingQuotationId: null });
    }
  },

  refreshCaches: async () => {
    await get().fetchClients();
    if (get().selectedClient) await get().fetchQuotationsByClient(get().selectedClient.id);
  },
  loadLatest: async client => {
    const sessionId = get().sessionId;
    const latest = await db.getLatestQuotation(client.id);
    if (get().sessionId === sessionId) {
      get().selectClient(client);
      get().loadQuotation(latest || { client_id: client.id, state: { ...migrateState(null), clientName: client.name } });
      set({ isClientModalOpen: false });
    }
  },

  loadQuotation: (quotation) => {
    const migrated = migrateState(quotation?.state || {});
    if (quotation?.client_id && get().selectedClient?.id !== quotation.client_id) {
      const client = get().clients.find(item => item.id === quotation.client_id);
      if (!client) throw new Error('Select the quotation\'s client before loading it.');
      get().selectClient(client);
    }
    set({
      sessionId: ++nextSession, saveError: null, saveRetryable: false, isSaving: false, savingRevision: null, issuingQuotationId: null,
      currentQuotation: quotation,
      currentQuotationId: quotation?.id || null,
      currentQuoteNumber: quotation?.quote_number || null,
      currentVersion: quotation?.version || 1,
      lastSavedAt: quotation?.updated_at || null,
    });
    useCalculatorStore.getState().loadState(migrated);
  },

  duplicateQuotation: (id) => {
    const key = `copy:${id}`;
    if (mutationRequests.has(key)) return mutationRequests.get(key);
    const operation = (async () => {
      try {
        const copy = await db.duplicateQuotation(id);
        await get().refreshCaches();
        return copy;
      } finally { mutationRequests.delete(key); }
    })();
    mutationRequests.set(key, operation);
    return operation;
  },

  deleteQuotation: async (id) => {
    try {
      await coordinator.remove(id);
      if (get().currentQuotationId === id) get().newQuote();
      removeDraft(id);
      await get().refreshCaches();
    } catch (err) {
      console.error('[clientStore] deleteQuotation error:', err);
      throw err;
    }
  },

  setHistoryOpen: (bool) => set({ isHistoryOpen: bool }),
  setClientModalOpen: (bool) => set({ isClientModalOpen: bool }),

  // ─── Legacy shims (App.js compatibility) ──────────

  setClient: (client) => set({
    selectedClient: client,
    currentQuotationId: null,
    currentQuoteNumber: null,
    currentVersion: 1,
    lastSavedAt: null,
  }),

  setCurrentQuotation: (quotation) => set({
    sessionId: ++nextSession, isSaving: false, savingRevision: null, issuingQuotationId: null, saveError: null, saveRetryable: false,
    currentQuotation: quotation,
    currentQuotationId: quotation?.id || null,
    currentQuoteNumber: quotation?.quote_number || null,
    currentVersion: quotation?.version || 1,
    lastSavedAt: quotation?.updated_at || null,
  }),

  setSaving: (val) => set({ isSaving: val }),
  setLastSaved: (at) => set({ lastSavedAt: at }),
  incrementVersion: () => set((s) => ({ currentVersion: s.currentVersion + 1 })),
  clearClient: () => set({
    selectedClient: null,
    currentQuotation: null,
    currentQuotationId: null,
    currentQuoteNumber: null,
    currentVersion: 1,
    lastSavedAt: null,
  }),
}));

export default useClientStore;

useCalculatorStore.subscribe((state, previous) => {
  if (state.editRevision !== previous.editRevision && state.isDirty) {
    const active = useClientStore.getState();
    if (previous.issueSnapshot && !state.issueSnapshot && (active.currentQuotation?.state?.issueSnapshot ||
      (active.issuingQuotationId && active.issuingQuotationId === active.currentQuotationId))) {
      const number = active.currentQuoteNumber;
      const version = active.currentVersion + 1;
      active.setCurrentQuotation(null);
      useClientStore.setState({ currentQuoteNumber: number, currentVersion: version });
    }
    useClientStore.getState().persistDraft();
  }
});


