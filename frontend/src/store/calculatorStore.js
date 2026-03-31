import { create } from 'zustand';
import { getDefaultState, migrateState, calcAll } from '../lib/calc';

const useCalculatorStore = create((set, get) => ({
  // ─── Calculator State ─────────────────────────────
  ...getDefaultState(),
  isDirty: false,

  // ─── Setters ──────────────────────────────────────
  setField: (field, value) => set((state) => ({
    [field]: value,
    isDirty: true,
  })),

  setOverride: (field, value) => set((state) => ({
    overrides: { ...state.overrides, [field]: value },
    isDirty: true,
  })),

  clearOverride: (field) => set((state) => {
    const overrides = { ...state.overrides };
    delete overrides[field];
    return { overrides, isDirty: true };
  }),

  setIsRepeatOrder: (val) => set({ isRepeatOrder: val, isDirty: true }),

  // ─── Load saved state ─────────────────────────────
  loadState: (saved) => set({ ...migrateState(saved), isDirty: false }),

  // ─── Reset ────────────────────────────────────────
  resetCalculator: () => set({ ...getDefaultState(), isDirty: false }),

  // ─── Mark clean ───────────────────────────────────
  markClean: () => set({ isDirty: false }),

  // ─── Derived computed (called inline) ─────────────
  getCalc: () => calcAll(get()),

  // ─── Serialize for save ───────────────────────────
  getSerializable: () => {
    const s = get();
    const { isDirty, setField, setOverride, clearOverride, setIsRepeatOrder, loadState, resetCalculator, markClean, getCalc, getSerializable, ...rest } = s;
    return rest;
  },
}));

export default useCalculatorStore;
