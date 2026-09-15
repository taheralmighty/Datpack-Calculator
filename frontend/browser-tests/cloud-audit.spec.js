const { test, expect } = require('@playwright/test');

test('schema failure is not offline or empty data and Reload restores cloud clients', async ({ page }) => {
  let schemaReady = false;
  await page.route('https://datpack-audit.invalid/**', async route => {
    if (!schemaReady) return route.fulfill({ status: 400, contentType: 'application/json',
      body: JSON.stringify({ code: '42703', message: 'column quotations_1.deleted_at does not exist' }) });
    const clients = [{ id: 'reloaded-client', name: 'Cloud client restored', quotations: [{ count: 0 }] }];
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify(new URL(route.request().url()).pathname.endsWith('/clients') ? clients : []) });
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('column quotations_1.deleted_at does not exist');
  await expect(page.getByText(/Local storage mode|offline mode/)).toHaveCount(0);
  await expect(page.getByText('Clients could not be loaded. Use Reload Clients to retry.', { exact: true })).toBeVisible();
  await expect(page.getByText('Recent quotations could not be loaded. Use Reload Clients to retry.', { exact: true })).toBeVisible();
  await expect(page.getByText('No clients yet. Add your first client below.', { exact: true })).toHaveCount(0);
  schemaReady = true;
  await page.getByRole('button', { name: 'Reload Clients', exact: true }).click();
  await expect(page.getByText('Cloud client restored', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

async function cloud(page) {
  const client = { id: '00000000-0000-4000-8000-000000000001', name: 'Network audit client', created_at: new Date().toISOString() };
  const control = { rows: [], writes: [], deletes: [], failNext: false, hold: null, errors: [], offline: false, loseResponse: false };
  page.on('pageerror', error => control.errors.push(error.message));
  await page.route('https://datpack-audit.invalid/**', async route => {
    const request = route.request(), url = new URL(request.url());
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    if (control.offline) return route.abort('internetdisconnected');
    expect(url.search).not.toContain('deleted_at');
    if (url.pathname.endsWith('/clients')) return reply([{ ...client, quotations: [{ count: control.rows.filter(row => !row.state._deletedAt).length }] }]);
    if (url.pathname.endsWith('/quotations')) {
      let body;
      if (request.method() !== 'GET') {
        body = request.postDataJSON();
        expect(body).not.toHaveProperty('revision');
        if (!body.state?._deletedAt) {
          control.writes.push({ payload: body, expected_revision: url.searchParams.get('updated_at')?.slice(3) || 0 });
          const hold = control.hold;
          control.hold = null;
          if (hold) await hold;
          if (control.failNext) { control.failNext = false; return reply({ code: 'AUDIT', message: 'Synthetic save unavailable' }, 503); }
        }
      }
      let rows = control.rows.filter(row => !url.searchParams.has('state->>_deletedAt') || !row.state._deletedAt);
      for (const key of ['id', 'client_id', 'updated_at']) if (url.searchParams.has(key)) rows = rows.filter(row => row[key] === url.searchParams.get(key).slice(3));
      if (request.method() === 'POST') {
        if (control.rows.some(row => row.id === body.id)) return reply({ code: '23505', message: 'Duplicate identity' }, 409);
        rows = [{ ...body, created_at: new Date().toISOString() }];
        control.rows.push(rows[0]);
      } else if (request.method() === 'PATCH') {
        rows.forEach(row => Object.assign(row, body));
        if (body.state?._deletedAt) control.deletes.push(...rows.map(row => row.id));
      }
      if (body && control.loseResponse) {
        control.loseResponse = false;
        control.offline = true;
        return route.abort('connectionreset');
      }
      rows = [...rows].reverse().map(row => ({ ...row, clients: { name: client.name } }));
      if (url.searchParams.has('limit')) rows = rows.slice(0, Number(url.searchParams.get('limit')));
      return reply(request.headers().accept?.includes('vnd.pgrst.object') ? rows[0] : rows);
    }
    throw new Error('Unexpected synthetic cloud request: ' + url.pathname);
  });
  await page.goto('/');
  await page.getByText(client.name, { exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  for (const [id, value] of Object.entries({ 'job-name-input': 'Network quote', 'order-qty-input': '5000', 'ups-per-sheet': '4', 'master-length-input': '20', 'master-width-input': '28', 'gsm-input': '300', 'paper-rate-input': '120' })) await page.getByTestId(id).fill(value);
  return control;
}
async function save(page) {
  await page.getByRole('button', { name: 'Save quotation', exact: true }).click();
  await expect(page.getByTestId('save-indicator')).toContainText('Saved');
}

test('real cloud adapter serializes delayed saves, retains new edits and retries failure', async ({ page }) => {
  const control = await cloud(page);
  let release;
  control.hold = new Promise(resolve => { release = resolve; });
  await page.getByRole('button', { name: 'Save quotation', exact: true }).click();
  await expect.poll(() => control.writes.length).toBe(1);
  await page.clock.install();
  await page.getByTestId('job-name-input').fill('Newer edit');
  await expect(page.getByRole('button', { name: 'Save quotation', exact: true })).toBeDisabled();
  await page.clock.fastForward(3100);
  expect(control.writes).toHaveLength(1);
  release();
  await expect(page.getByTestId('save-indicator')).toContainText('Saved');
  await expect.poll(() => control.rows[0]?.job_name).toBe('Newer edit');
  expect(control.rows).toHaveLength(1);
  expect(control.writes[1].expected_revision).toBe(control.writes[0].payload.updated_at);
  control.failNext = true;
  await page.getByTestId('job-name-input').fill('Retry this edit');
  await page.getByRole('button', { name: 'Save quotation', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Synthetic save unavailable');
  expect(control.rows[0].job_name).toBe('Newer edit');
  await page.getByRole('button', { name: 'Retry Save', exact: true }).click();
  await expect(page.getByTestId('save-indicator')).toContainText('Saved');
  expect(control.rows[0].job_name).toBe('Retry this edit');
  expect(control.errors).toEqual([]);
});

test('deleting during an in-flight save cannot resurrect that identity', async ({ page }) => {
  const control = await cloud(page);
  await save(page);
  const originalId = control.rows[0].id;
  let release;
  control.hold = new Promise(resolve => { release = resolve; });
  await page.getByTestId('job-name-input').fill('Late edit');
  await page.getByRole('button', { name: 'Save quotation', exact: true }).click();
  await expect.poll(() => control.writes.length).toBe(2);
  await page.getByTestId('history-btn').click();
  const history = page.getByRole('dialog', { name: 'Quotation history' });
  await history.getByRole('button', { name: 'Delete Network quote', exact: true }).click();
  await history.getByRole('button', { name: 'Yes', exact: true }).click();
  expect(control.deletes).toHaveLength(0);
  release();
  await expect.poll(() => control.deletes).toEqual([originalId]);
  await expect(history.getByRole('button', { name: /^Delete / })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(history).toHaveCount(0);
  await page.getByTestId('job-name-input').fill('New identity after delete');
  await save(page);
  expect(control.rows.find(row => row.id === originalId).state._deletedAt).toBeTruthy();
  expect(control.rows.filter(row => !row.state._deletedAt)).toHaveLength(1);
  expect(control.rows.find(row => !row.state._deletedAt).id).not.toBe(originalId);
  expect(control.errors).toEqual([]);
});

test('editing during first issue save preserves the issued record and forks a revision', async ({ page }) => {
  const control = await cloud(page);
  let release;
  control.hold = new Promise(resolve => { release = resolve; });
  const download = page.waitForEvent('download');
  await page.getByTestId('export-pdf-btn').click();
  await expect.poll(() => control.writes.length).toBe(1);
  await page.getByTestId('order-qty-input').fill('6000');
  release();
  await download;
  await save(page);
  expect(control.rows).toHaveLength(2);
  const issued = control.rows.find(row => row.version === 1), revision = control.rows.find(row => row.version === 2);
  expect(Number(issued.state.issueSnapshot.state.orderQty)).toBe(5000);
  expect(Number(revision.state.orderQty)).toBe(6000);
  expect(revision.quote_number).toBe(issued.quote_number);
  expect(revision.id).not.toBe(issued.id);
  expect(control.errors).toEqual([]);
});

test('A-E: Supabase outage, refresh recovery, reconnect and authoritative reload', async ({ page }) => {
  const control = await cloud(page);
  await save(page);
  const original = { ...control.rows[0] };
  control.offline = true;
  await page.getByTestId('job-name-input').fill('Offline protected changes');
  await page.getByRole('button', { name: 'Save quotation', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('changes saved on this device and will retry');
  await expect(page.getByTestId('save-indicator')).toContainText('Waiting to retry');
  expect(control.rows[0].job_name).toBe(original.job_name);
  expect(await page.evaluate(() => localStorage.getItem('datpack_quotations'))).toBeNull();
  page.on('dialog', dialog => dialog.accept());
  await page.reload();
  await page.getByRole('button', { name: 'Recover', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('job-name-input')).toHaveValue('Offline protected changes');
  await page.getByRole('button', { name: 'Save quotation', exact: true }).click();
  await expect(page.getByTestId('save-indicator')).toContainText('Waiting to retry');
  control.offline = false;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByTestId('save-indicator')).toContainText('Saved');
  await expect.poll(() => control.rows[0].job_name).toBe('Offline protected changes');
  expect(control.rows).toHaveLength(1);
  expect(control.rows[0].id).toBe(original.id);
  expect(control.rows[0].quote_number).toBe(original.quote_number);
  expect(control.rows[0].client_id).toBe(original.client_id);
  await page.reload();
  await page.getByRole('button', { name: 'Load', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('job-name-input')).toHaveValue('Offline protected changes');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(control.errors).toEqual([]);
});

test('a committed save with lost response is reconciled before newer recovered edits', async ({ page }) => {
  const control = await cloud(page);
  control.loseResponse = true;
  await page.getByRole('button', { name: 'Save quotation', exact: true }).click();
  await expect(page.getByTestId('save-indicator')).toContainText('Waiting to retry');
  expect(control.rows).toHaveLength(1);
  const originalId = control.rows[0].id;
  await page.getByTestId('job-name-input').fill('Newer offline edit after response loss');
  page.on('dialog', dialog => dialog.accept());
  await page.reload();
  await page.getByRole('button', { name: 'Recover', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  control.offline = false;
  await page.getByRole('button', { name: 'Save quotation', exact: true }).click();
  await expect(page.getByTestId('save-indicator')).toContainText('Saved');
  expect(control.rows).toHaveLength(1);
  expect(control.rows[0].id).toBe(originalId);
  expect(control.rows[0].job_name).toBe('Newer offline edit after response loss');
  expect(control.errors).toEqual([]);
});

for (const change of ['newer remote edit', 'remote deletion']) {
  test(`offline recovery cannot overwrite ${change}`, async ({ page }) => {
    const control = await cloud(page);
    await save(page);
    control.offline = true;
    await page.getByTestId('job-name-input').fill('Pending local draft');
    await page.getByRole('button', { name: 'Save quotation', exact: true }).click();
    await expect(page.getByTestId('save-indicator')).toContainText('Waiting to retry');
    control.rows[0].updated_at = '2099-01-01T00:00:00.000Z';
    control.rows[0].state = { ...control.rows[0].state, ...(change === 'remote deletion' ? { _deletedAt: '2099-01-01' } : { jobName: 'Newer authoritative content' }) };
    const remote = JSON.stringify(control.rows[0]);
    control.offline = false;
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(page.getByRole('alert')).toContainText('changed elsewhere');
    await expect(page.getByTestId('save-indicator')).toContainText('Save failed');
    expect(JSON.stringify(control.rows[0])).toBe(remote);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('datpack_recovery_drafts'))[0].state.jobName)).toBe('Pending local draft');
    expect(control.errors).toEqual([]);
  });
}