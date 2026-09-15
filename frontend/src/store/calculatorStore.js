import { create } from 'zustand';
import { getDefaultState, migrateState, calcAll } from '../lib/calc';
import { overrideError } from '../lib/validation';
export { calcAll } from '../lib/calc';

const useCalculatorStore = create((set, get) => ({
  // ─── Calculator State ─────────────────────────────
  ...getDefaultState(),
  isDirty: false,
  editRevision: 0,
  validationError: null,

  // ─── Setters ──────────────────────────────────────
  setField: (field, value) => set((state) => ({
    [field]: value,
    isDirty: true,
    editRevision: state.editRevision + 1,
    ...(state.issueSnapshot && !['issuedAt', 'issueSnapshot'].includes(field) ? { issueSnapshot: null, revisedAt: new Date().toISOString() } : {}),
  })),

  setOverride: (field, value) => {
    const error = overrideError(field, value);
    if (error) { set({ validationError: error }); return; }
    set(state => ({ overrides: { ...state.overrides, [field]: Number(value) }, validationError: null,
      isDirty: true, editRevision: state.editRevision + 1, issueSnapshot: null,
      revisedAt: state.issuedAt ? new Date().toISOString() : state.revisedAt }));
  },

  clearOverride: (field) => set((state) => {
    const overrides = { ...state.overrides };
    delete overrides[field];
    return { overrides, isDirty: true, editRevision: state.editRevision + 1, issueSnapshot: null,
      revisedAt: state.issuedAt ? new Date().toISOString() : state.revisedAt };
  }),

  // ─── Load saved state ─────────────────────────────
  loadState: (saved) => set(state => ({ ...migrateState(saved), isDirty: false, validationError: null, editRevision: state.editRevision + 1 })),

  // ─── Reset ────────────────────────────────────────
  resetCalculator: () => set(state => ({ ...getDefaultState(), isDirty: false, validationError: null, editRevision: state.editRevision + 1 })),

  // ─── Mark clean ───────────────────────────────────
  markClean: (revision) => set(state => revision === state.editRevision ? { isDirty: false } : {}),

  // ─── Derived computed (called inline) ─────────────
  getCalc: () => calcAll(get()),

  // ─── Serialize for save ───────────────────────────
  getSerializable: () => {
    return migrateState(get());
  },

}));

export default useCalculatorStore;
