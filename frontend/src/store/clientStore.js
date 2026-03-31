import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useClientStore = create(
  persist(
    (set, get) => ({
      // ─── Selected Client ──────────────────────────
      selectedClient: null,
      currentQuotationId: null,
      currentQuoteNumber: null,
      currentVersion: 1,
      lastSavedAt: null,
      isSaving: false,
      saveError: null,

      // ─── Actions ──────────────────────────────────
      setClient: (client) => set({
        selectedClient: client,
        currentQuotationId: null,
        currentQuoteNumber: null,
        currentVersion: 1,
        lastSavedAt: null,
      }),

      setCurrentQuotation: (quotation) => set({
        currentQuotationId: quotation?.id || null,
        currentQuoteNumber: quotation?.quote_number || null,
        currentVersion: quotation?.version || 1,
        lastSavedAt: quotation?.updated_at || null,
      }),

      setSaving: (val) => set({ isSaving: val }),
      setSaveError: (err) => set({ saveError: err }),
      setLastSaved: (at) => set({ lastSavedAt: at }),
      incrementVersion: () => set((s) => ({ currentVersion: s.currentVersion + 1 })),
      clearClient: () => set({ selectedClient: null, currentQuotationId: null, currentQuoteNumber: null, currentVersion: 1, lastSavedAt: null }),
    }),
    { name: 'datpack-client-store', partialize: (s) => ({ selectedClient: s.selectedClient }) }
  )
);

export default useClientStore;
