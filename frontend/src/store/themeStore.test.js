test('theme uses one shared source and survives denied local storage', () => {
  jest.resetModules();
  const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
  const store = require('./themeStore').default;
  expect(store.getState().isDark).toBe(false);
  store.getState().toggle();
  expect(store.getState().isDark).toBe(true);
  expect(document.documentElement.classList.contains('dark')).toBe(true);
  window.dispatchEvent(new StorageEvent('storage', { key: 'datpack-theme', newValue: 'light' }));
  expect(store.getState().isDark).toBe(false);
  getItem.mockRestore(); setItem.mockRestore();
});