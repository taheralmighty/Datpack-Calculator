const base = require('@playwright/test');
const { randomUUID } = require('node:crypto');

async function createSupabaseFixture(page) {
  const database = { clients: [], quotations: [], failWrites: false };
  await page.route('https://datpack-audit.invalid/**', async route => {
    const request = route.request(), url = new URL(request.url());
    const table = url.pathname.split('/').pop();
    const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (!['clients', 'quotations'].includes(table)) throw new Error('Unexpected table: ' + table);
    if (request.method() !== 'GET' && database.failWrites) return reply({ code: 'AUDIT', message: 'Synthetic save unavailable' }, 403);
    let rows = database[table];
    for (const field of ['id', 'client_id', 'updated_at']) {
      if (url.searchParams.has(field)) rows = rows.filter(row => row[field] === url.searchParams.get(field).slice(3));
    }
    if (table === 'quotations' && url.searchParams.has('state->>_deletedAt')) rows = rows.filter(row => !row.state?._deletedAt);
    if (request.method() === 'POST') {
      const payload = request.postDataJSON();
      const values = Array.isArray(payload) ? payload : [payload];
      if (values.some(value => value.id && database[table].some(row => row.id === value.id))) return reply({ code: '23505', message: 'Duplicate ID' }, 409);
      rows = values.map(value => ({ id: randomUUID(), created_at: new Date().toISOString(), ...value }));
      database[table].push(...rows);
    } else if (request.method() === 'PATCH') rows.forEach(row => Object.assign(row, request.postDataJSON()));
    if (table === 'clients') rows = rows.map(client => ({ ...client, quotations: [{ count: database.quotations.filter(row => row.client_id === client.id && !row.state?._deletedAt).length }] }));
    else rows = rows.map(row => ({ ...row, clients: { name: database.clients.find(client => client.id === row.client_id)?.name || '' } }));
    const order = url.searchParams.get('order')?.split('.')[0];
    if (order) rows = [...rows].sort((first, second) => new Date(second[order]) - new Date(first[order]));
    if (url.searchParams.has('limit')) rows = rows.slice(0, Number(url.searchParams.get('limit')));
    return reply(request.headers().accept?.includes('vnd.pgrst.object') ? rows[0] || null : rows);
  });
  return database;
}

const test = base.test.extend({ database: [async ({ page }, use) => use(await createSupabaseFixture(page)), { auto: true }] });
module.exports = { test, expect: base.expect, createSupabaseFixture };