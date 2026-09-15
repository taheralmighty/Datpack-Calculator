import { create } from 'zustand';

const readTheme = () => {
  try { return localStorage.getItem('datpack-theme') === 'dark'; }
  catch { return false; }
};
const applyTheme = isDark => document.documentElement.classList.toggle('dark', isDark);
const useThemeStore = create((set, get) => ({
  isDark: readTheme(),
  toggle: () => {
    const isDark = !get().isDark;
    applyTheme(isDark);
    try { localStorage.setItem('datpack-theme', isDark ? 'dark' : 'light'); } catch {}
    set({ isDark });
  },
}));
applyTheme(useThemeStore.getState().isDark);
window.addEventListener('storage', event => {
  if (event.key === 'datpack-theme') {
    const isDark = event.newValue === 'dark';
    applyTheme(isDark); useThemeStore.setState({ isDark });
  }
});
export default useThemeStore;