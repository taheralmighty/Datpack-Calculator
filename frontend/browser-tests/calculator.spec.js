const { test, expect, createSupabaseFixture } = require('./supabase-fixture');

test.beforeEach(async ({ page, database }) => {
  database.clients = [{ id: 'browser-client', name: 'Browser client', created_at: new Date().toISOString() }];
  await page.goto('/');
  await page.getByText('Browser client', { exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Clients and quotations' })).toHaveCount(0);
  await expect(page.locator('#root')).not.toHaveAttribute('inert', '');
});

test('recoverable draft, save/export identity and real PDF size', async ({ page, database }) => {
  for (const [id, value] of Object.entries({ 'job-name-input': 'Browser quotation', 'order-qty-input': '5000', 'ups-per-sheet': '4', 'master-length-input': '20', 'master-width-input': '28', 'gsm-input': '300', 'paper-rate-input': '120' })) {
    await page.getByTestId(id).fill(value);
  }
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('datpack_recovery_drafts') || '[]').length)).toBe(1);
  const download = page.waitForEvent('download');
  await page.getByTestId('export-pdf-btn').click();
  const file = await download;
  expect(await file.failure()).toBeNull();
  const path = await file.path();
  const size = require('node:fs').statSync(path).size;
  expect(size).toBeLessThan(1000000);
  console.log(`Real PDF: ${size} bytes`);
  const saved = database.quotations[0];
  expect(file.suggestedFilename()).toContain(saved.quote_number);
  expect(saved.state._quoteNumber).toBe(saved.quote_number);
  expect(saved.state.issuedAt).toBeTruthy();
  const csvDownload = page.waitForEvent('download');
  await page.getByTestId('export-csv-btn').click();
  const csvFile = await csvDownload;
  const csvText = require('node:fs').readFileSync(await csvFile.path(), 'utf8');
  expect(csvText).toContain('Rate Rounding Adjustment');
  expect(csvFile.suggestedFilename()).toContain(saved.quote_number);
});

test('real Unicode and long text PDF has readable text and multiple pages', async ({ page }) => {
  const clientName = '\u0928\u092e\u0938\u094d\u0924\u0947';
  await page.getByTestId('client-name-input').fill(clientName);
  for (const [id, value] of Object.entries({ 'job-name-input': 'Long quotation description '.repeat(500), 'order-qty-input': '1000', 'ups-per-sheet': '4', 'master-length-input': '20', 'master-width-input': '28', 'gsm-input': '300', 'paper-rate-input': '120' })) await page.getByTestId(id).fill(value);
  const download = page.waitForEvent('download');
  await page.getByTestId('export-pdf-btn').click();
  const file = await download;
  const bytes = new Uint8Array(require('node:fs').readFileSync(await file.path()));
  const byteLength = bytes.length;
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({ data: bytes, useSystemFonts: true });
  const document = await loadingTask.promise;
  expect(document.numPages).toBeGreaterThan(1);
  let text = '';
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const content = await (await document.getPage(pageNumber)).getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    expect(pageText).toContain('Thank you for your business.');
    text += pageText;
  }
  expect(text).toContain(clientName);
  expect(text).toContain('Long quotation description');
  console.log(`Unicode PDF: ${byteLength} bytes, ${document.numPages} pages`);
  await loadingTask.destroy();
});

for (const width of [320, 390, 768, 1440]) {
  test(`dropdown, dirty guard and dialog focus at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('#section-4 > button').click();
    await page.getByTestId('machine-size').click();
    await page.keyboard.press('End'); await page.keyboard.press('Enter');
    await expect(page.getByTestId('machine-size')).toContainText('Size 4');
    await page.getByTestId('job-name-input').fill('Unsaved');
    await page.getByTestId('new-quote-btn').click();
    const dialog = page.getByRole('dialog', { name: 'Unsaved quotation' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page.getByTestId('job-name-input')).toHaveValue('Unsaved');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('refresh recovers the identity-scoped draft before autosave', async ({ page }) => {
  await page.getByTestId('job-name-input').fill('Recover this draft');
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('datpack_recovery_drafts'))[0]);
  page.on('dialog', dialog => dialog.accept());
  await page.reload();
  await page.getByRole('button', { name: 'Recover', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Clients and quotations' })).toHaveCount(0);
  await expect(page.getByTestId('job-name-input')).toHaveValue('Recover this draft');
  const recovered = await page.evaluate(() => JSON.parse(localStorage.getItem('datpack_recovery_drafts'))[0]);
  expect(recovered.id).toBe(draft.id);
  expect(recovered.client_id).toBe(draft.client_id);
});

test('fresh reduced motion and both dropdown directions retain keyboard operation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.getByText('Browser client', { exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Clients and quotations' })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const section of [4, 5, 6, 7, 8, 9, 10]) await page.locator(`#section-${section} > button`).click();
  const trigger = page.getByTestId('machine-size');
  for (const direction of ['down', 'up']) {
    await trigger.evaluate((element, direction) => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY - (direction === 'down' ? 160 : innerHeight - 150), behavior: 'instant' }), direction);
    await trigger.focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox')).toHaveAttribute('data-direction', direction);
    await expect(trigger.locator('..').locator('.premium-select-label')).toHaveAttribute('data-direction', direction);
    expect(await trigger.locator('svg').evaluate(element => element.style.transition)).toBe('none');
    await page.keyboard.press('Escape');
  }
  expect(await page.locator('html').evaluate(element => element.classList.contains('custom-cursor-active'))).toBe(false);
});

test('shared modal and header themes agree and modal traps keyboard focus', async ({ page }) => {
  await page.getByTestId('client-switcher').click();
  const dialog = page.getByRole('dialog', { name: 'Clients and quotations' });
  await dialog.getByRole('button', { name: 'Switch to dark mode' }).click();
  await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('app-header').getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
  await page.getByTestId('app-header').getByRole('button', { name: 'Switch to light mode' }).click();
  expect(await page.locator('html').evaluate(element => element.classList.contains('dark'))).toBe(false);
});

test('touch history actions and feedback stay visible on narrow screens', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 740 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  try {
    const database = await createSupabaseFixture(page);
    const now = new Date().toISOString();
    database.clients = [{ id: 'touch-client', name: 'Touch client', created_at: now }];
    database.quotations = [{ id: 'touch-quote', client_id: 'touch-client', job_name: 'Touch quote', quote_number: 'QT-TOUCH', version: 1, created_at: now, updated_at: now,
      state: { pricingModelVersion: 2, clientName: 'Touch client', jobName: 'Touch quote', orderQty: 1000, upsPerSheet: 4, masterLength: 20, masterWidth: 28, gsm: 300, paperRate: 120, platenWastage: 0.05, margin: 0.2, gst: 0.18, overrides: {} } }];
    await page.goto('http://127.0.0.1:3012');
    await page.getByRole('button', { name: 'Load', exact: true }).first().tap();
    await expect(page.getByRole('dialog', { name: 'Clients and quotations' })).toHaveCount(0);
    await page.getByTestId('history-btn').tap();
    const history = page.getByRole('dialog', { name: 'Quotation history' });
    await expect(history.getByRole('button', { name: 'Delete Touch quote', exact: true })).toBeVisible();
    expect(await history.getByRole('button', { name: 'Delete Touch quote', exact: true }).evaluate(element => getComputedStyle(element).opacity)).toBe('1');
    await history.getByTitle('Duplicate', { exact: true }).first().tap();
    const toast = page.getByText('Duplicate created', { exact: true });
    await expect(toast).toBeVisible();
    const rect = await toast.boundingBox();
    expect(rect.x).toBeGreaterThanOrEqual(0); expect(rect.x + rect.width).toBeLessThanOrEqual(320);
    await history.getByRole('button', { name: 'Delete Touch quote', exact: true }).tap();
    await history.getByRole('button', { name: 'Yes', exact: true }).tap();
    await expect(history.getByRole('button', { name: 'Delete Touch quote', exact: true })).toHaveCount(0);
    await expect.poll(() => database.quotations.find(quote => quote.id === 'touch-quote').state._deletedAt).toBeTruthy();
  } finally { await context.close(); }
});