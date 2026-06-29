import { create } from 'zustand';
import * as db from '../lib/db';
import useCalculatorStore from './calculatorStore';

const genQuoteNumber = () =>
  'QT-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') +
  '-' + Math.floor(1000 + Math.random() * 9000);

const useClientStore = create((set, get) => ({
  // ─── State ────────────────────────────────────────
  clients: [],
  selectedClient: null,
  quotations: [],
  allQuotations: [],
  currentQuotation: null,
  isLoadingClients: false,
  isLoadingQuotations: false,
  isHistoryOpen: false,
  isClientModalOpen: true,

  // ─── Legacy state fields (used by App.js) ─────────
  currentQuotationId: null,
  currentQuoteNumber: null,
  currentVersion: 1,
  isSaving: false,
  lastSavedAt: null,

  // ─── New Actions ──────────────────────────────────

  fetchClients: async () => {
    set({ isLoadingClients: true });
    try {
      const clients = await db.getClients();
      set({ clients: clients || [] });
      get().fetchAllQuotations();
    } catch (err) {
      console.error('[clientStore] fetchClients error:', err);
    } finally {
      set({ isLoadingClients: false });
    }
  },

  fetchAllQuotations: async () => {
    try {
      const allQuotations = await db.getAllQuotations();
      set({ allQuotations: allQuotations || [] });
    } catch (err) {
      console.error('[clientStore] fetchAllQuotations error:', err);
    }
  },

  selectClient: (client) => {
    set({ selectedClient: client });
    get().fetchQuotationsByClient(client.id);
  },

  fetchQuotationsByClient: async (clientId) => {
    set({ isLoadingQuotations: true });
    try {
      const quotations = await db.getQuotationsByClient(clientId);
      set({ quotations: quotations || [] });
    } catch (err) {
      console.error('[clientStore] fetchQuotationsByClient error:', err);
    } finally {
      set({ isLoadingQuotations: false });
    }
  },

  createNewClient: async (data) => {
    try {
      const client = await db.createClient(data);
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

  saveCurrentQuotation: async (calculatorState) => {
    const { selectedClient, currentQuotation, currentQuoteNumber, currentVersion } = get();
    if (!selectedClient) return;

    const quoteNumber = currentQuoteNumber || genQuoteNumber();
    const version = currentVersion;
    const payload = {
      id: currentQuotation?.id || undefined,
      client_id: selectedClient.id,
      job_name: calculatorState.jobName || 'Untitled',
      quote_number: quoteNumber,
      version,
      is_repeat_order: calculatorState.isRepeatOrder || false,
      state: calculatorState,
    };

    try {
      const saved = await db.saveQuotation(payload);
      set({ currentQuotation: saved, currentQuotationId: saved.id, currentQuoteNumber: saved.quote_number, currentVersion: saved.version, lastSavedAt: saved.updated_at });
      get().fetchQuotationsByClient(selectedClient.id);
      useCalculatorStore.getState().markClean();
      return saved;
    } catch (err) {
      console.error('[clientStore] saveCurrentQuotation error:', err);
      throw err;
    }
  },

  loadQuotation: (quotation) => {
    set({
      currentQuotation: quotation,
      currentQuotationId: quotation?.id || null,
      currentQuoteNumber: quotation?.quote_number || null,
      currentVersion: quotation?.version || 1,
      lastSavedAt: quotation?.updated_at || null,
    });
    if (quotation?.state) {
      useCalculatorStore.setState({ ...quotation.state, isDirty: false });
    }
  },

  duplicateQuotation: async (id) => {
    try {
      await db.duplicateQuotation(id);
      const { selectedClient } = get();
      if (selectedClient) get().fetchQuotationsByClient(selectedClient.id);
    } catch (err) {
      console.error('[clientStore] duplicateQuotation error:', err);
      throw err;
    }
  },

  deleteQuotation: async (id) => {
    try {
      await db.deleteQuotation(id);
      set((s) => ({ quotations: s.quotations.filter((q) => q.id !== id) }));
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


