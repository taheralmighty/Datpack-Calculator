jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => ({ shared: true })) }));
const originalURL = process.env.REACT_APP_SUPABASE_URL;
const originalKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
afterEach(() => {
  if (originalURL === undefined) delete process.env.REACT_APP_SUPABASE_URL; else process.env.REACT_APP_SUPABASE_URL = originalURL;
  if (originalKey === undefined) delete process.env.REACT_APP_SUPABASE_ANON_KEY; else process.env.REACT_APP_SUPABASE_ANON_KEY = originalKey;
});
test.each(['sb_secret_test-not-a-real-key', `header.${btoa(JSON.stringify({ role: 'service_role' }))}.signature`])('privileged frontend key form is rejected', key => {
  jest.resetModules();
  process.env.REACT_APP_SUPABASE_URL = 'https://internal.example';
  process.env.REACT_APP_SUPABASE_ANON_KEY = key;
  expect(() => require('./supabase')).toThrow(/Privileged/);
});
test('public key initializes the shared no-login client without creating auth UX', () => {
  jest.resetModules();
  process.env.REACT_APP_SUPABASE_URL = 'https://internal.example';
  process.env.REACT_APP_SUPABASE_ANON_KEY = 'sb_publishable_test-not-a-real-key';
  expect(require('./supabase').hasSupabase).toBe(true);
});