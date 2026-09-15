const { test, expect } = require('./supabase-fixture');
const diagnostics = new WeakMap();

const fields = {
  'job-name-input': 'Full regression quote', 'order-qty-input': '5000', 'ups-per-sheet': '4',
  'master-length-input': '20', 'master-width-input': '28', 'gsm-input': '300', 'paper-rate-input': '120',
};
const money = value => '₹' + value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
async function choose(page, field, label) {
  await page.getByTestId(field).click();
  await page.getByRole('option', { name: label, exact: true }).click();
}
async function openSections(page) {
  for (let section = 3; section <= 10; section++) {
    const header = page.locator(`#section-${section} > button`);
    if (await header.getAttribute('aria-expanded') === 'false') await header.click();
  }
}
async function save(page) {
  await page.getByRole('button', { name: 'Save quotation', exact: true }).click();
  await expect(page.getByTestId('save-indicator')).toContainText('Saved');
}

test.beforeEach(async ({ page, database }) => {
  const events = { pageErrors: [], console: [], failedRequests: [] };
  diagnostics.set(page, events);
  page.on('pageerror', error => events.pageErrors.push(error.message));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) events.console.push(message.text()); });
  page.on('requestfailed', request => events.failedRequests.push({ path: new URL(request.url()).pathname, failure: request.failure()?.errorText }));
  database.clients = [
      { id: 'audit-a', name: 'Audit Client A', created_at: new Date().toISOString() },
      { id: 'audit-b', name: 'Audit Client B', created_at: new Date().toISOString() },
    ];
  await page.goto('/');
  await page.getByText('Audit Client A', { exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Clients and quotations' })).toHaveCount(0);
});

test.afterEach(async ({ page }, testInfo) => {
  await testInfo.attach('browser-diagnostics', { body: JSON.stringify(diagnostics.get(page)), contentType: 'application/json' });
  expect(diagnostics.get(page).pageErrors).toEqual([]);
});

test('every rate option, all calculated fields and all overrides survive the real UI', async ({ page, database }) => {
  test.setTimeout(180000);
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  for (const [id, value] of Object.entries(fields)) await page.getByTestId(id).fill(value);
  await openSections(page);
  await expect(page.getByTestId('net-sheets')).toContainText('1,250');
  await expect(page.getByTestId('gross-sheets')).toContainText('1,313');
  const paper = 1313 * 20 * 28 * 300 / 1550000 * 120;
  await expect(page.getByTestId('total-paper-cost')).toContainText(money(paper));
  for (const [label, plate, print, punch, run] of [
    ['Size 1', 1200, 1500, 1500, 400], ['Size 2', 1500, 1800, 2000, 450],
    ['Size 3', 2400, 3200, 2500, 600], ['Size 4', 3000, 3500, 3000, 700],
  ]) {
    await choose(page, 'machine-size', label);
    for (const [id, value] of [['plate-cost', plate], ['print-price', print], ['punch-cost', punch], ['punching-cost-per-1000', run], ['total-print-cost', plate + 2 * print], ['total-die-cutting-cost', punch + 2 * run]]) await expect(page.getByTestId(id)).toContainText(money(value));
  }
  for (const [label, rate] of [['Regular - Gloss', 0.4], ['Regular - Matte', 0.5], ['Regular - Velvet', 1.25], ['Thermal - Gloss', 0.7], ['Thermal - Matte', 0.8], ['Thermal - Velvet', 2.25]]) {
    await choose(page, 'lamination-type', label);
    await expect(page.getByTestId('total-lam-cost')).toContainText(money(1313 * 20 * 28 * rate / 100));
  }
  for (const [label, block, rate] of [['Small', 1000, 1500], ['Medium', 1750, 2500], ['Large', 2500, 3500], ['XL', 4000, 5000]]) {
    await choose(page, 'foiling-size', label);
    await expect(page.getByTestId('foil-block-cost')).toContainText(money(block));
    await expect(page.getByTestId('foiling-run-rate')).toContainText(money(rate));
    await expect(page.getByTestId('total-foiling-cost')).toContainText(money(block + 2 * rate));
  }
  for (const [label, rate] of [['Spot UV', 2000], ['Emboss UV', 4000]]) {
    await choose(page, 'uv-type', label);
    await expect(page.getByTestId('total-uv-cost')).toContainText(money(2 * rate));
  }
  for (const [label, rate] of [['Side Pasting', .25], ['Auto Locking', .5], ['Envelope', 2.5], ['Paper Bag Small', 3], ['Paper Bag Medium', 4], ['Paper Bag Large', 5], ['Ribbon Paper Bag', 12]]) {
    await choose(page, 'pasting-type', label);
    await expect(page.getByTestId('total-pasting-cost')).toContainText(money(5000 * rate));
  }
  await choose(page, 'machine-size', 'Size 3'); await choose(page, 'lamination-type', 'Thermal - Matte');
  await choose(page, 'foiling-size', 'Large'); await choose(page, 'pasting-type', 'Envelope');
  const production = paper + 8800 + 5882.24 + 9500 + 8000 + 3700 + 12500;
  for (const [id, value] of [['production-cost-display', production], ['cost-per-unit-display', production / 5000], ['selling-price-display', production / 5000 / .8], ['subtotal-display', production / .8], ['gst-amount-display', production / .8 * .18], ['final-total-display', production / .8 * 1.18]]) await expect(page.getByTestId(id)).toHaveText(money(value));
  const overrides = [
    ['net-sheets', 'Net Sheets Required', 'netSheets', 1400], ['gross-sheets', 'Gross Sheets Needed', 'grossSheets', 2201],
    ['total-paper-cost', 'Total Paper Cost', 'totalPaperCost', 1111], ['total-print-cost', 'Total Print Cost', 'totalPrintCost', 2222],
    ['total-lam-cost', 'Total Lamination Cost', 'totalLamCost', 3333], ['total-foiling-cost', 'Total Foiling Cost', 'totalFoilingCost', 4444],
    ['total-uv-cost', 'Total UV Cost', 'totalSpotUVCost', 5555], ['total-die-cutting-cost', 'Total Punching Cost', 'totalDieCuttingCost', 6666],
    ['total-pasting-cost', 'Total Pasting Cost', 'totalPastingCost', 7777],
  ];
  for (const [id, label, key, value] of overrides) {
    await page.getByTestId(id).getByRole('button', { name: `Formula for ${label}`, exact: true }).focus();
    await expect(page.getByRole('tooltip')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: `Edit ${label}`, exact: true }).click();
    await page.getByRole('spinbutton', { name: `Override ${label}`, exact: true }).fill(String(value));
    await page.keyboard.press('Enter');
    await save(page);
    expect(database.quotations[0].state.overrides[key]).toBe(value);
    await page.reload();
    await page.getByRole('button', { name: 'Load', exact: true }).first().click();
    await expect(page.getByRole('dialog', { name: 'Clients and quotations' })).toHaveCount(0);
    await openSections(page);
    await expect(page.getByTestId(id)).toContainText('Override');
    await page.getByRole('button', { name: `Reset ${label}`, exact: true }).click();
    await expect(page.getByTestId(id)).not.toContainText('Override');
    await save(page);
  }
  await expect(page.getByTestId('final-total-display')).toHaveText(money(production / .8 * 1.18));
  await page.getByTestId('margin-input').fill('0'); await page.getByTestId('gst-input').fill('0');
  await expect(page.getByTestId('final-total-display')).toHaveText(money(production));
  expect(runtimeErrors).toEqual([]);
});

test('failed save, nested cancel/save transition, Latest and client isolation', async ({ page, database }) => {
  for (const [id, value] of Object.entries(fields)) await page.getByTestId(id).fill(value);
  await save(page);
  database.failWrites = true;
  await page.getByTestId('job-name-input').fill('Unsaved audit change');
  await page.getByRole('button', { name: 'Save quotation', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Synthetic save unavailable');
  await expect(page.getByTestId('save-indicator')).toContainText('Save failed');
  await page.getByTestId('client-switcher').click();
  await page.getByRole('dialog', { name: 'Clients and quotations' }).getByRole('button', { name: 'Load', exact: true }).first().click();
  const confirmation = page.getByRole('dialog', { name: 'Unsaved quotation' });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(confirmation).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('job-name-input')).toHaveValue('Unsaved audit change');
  database.failWrites = false;
  await page.getByRole('button', { name: 'Retry Save', exact: true }).click();
  await expect(page.getByTestId('save-indicator')).toContainText('Saved');
  await page.getByTestId('job-name-input').fill('Saved during transition');
  await page.getByTestId('client-switcher').click();
  await page.getByRole('dialog', { name: 'Clients and quotations' }).getByText('Audit Client B', { exact: true }).click();
  await confirmation.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('client-name-input')).toHaveValue('Audit Client B');
  await expect(page.getByTestId('job-name-input')).toHaveValue('');
  await page.getByTestId('history-btn').click();
  await expect(page.getByRole('dialog', { name: 'Quotation history' })).not.toContainText('Saved during transition');
  await page.keyboard.press('Escape');
  await page.getByTestId('client-switcher').click();
  const clientCard = page.getByText('Audit Client A', { exact: true }).locator('..').locator('..');
  await clientCard.getByRole('button', { name: 'Latest', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByTestId('job-name-input')).toHaveValue('Saved during transition');
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`all dropdowns, keyboard, wheel and theme at ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 900 });
    for (const [id, value] of Object.entries(fields)) await page.getByTestId(id).fill(value);
    await openSections(page);
    for (const id of ['machine-size', 'lamination-type', 'foiling-size', 'uv-type', 'pasting-type']) {
      const trigger = page.getByTestId(id);
      for (const direction of ['down', 'up']) {
        await trigger.evaluate((element, direction) => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY - (direction === 'down' ? 180 : innerHeight - 160), behavior: 'instant' }), direction);
        await trigger.focus(); await page.keyboard.press('Enter');
        const panel = page.getByRole('listbox');
        await expect(panel).toHaveAttribute('data-direction', direction);
        const bounds = await panel.boundingBox();
        expect(bounds.x).toBeGreaterThanOrEqual(0); expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
        expect(bounds.y).toBeGreaterThanOrEqual(0); expect(bounds.y + bounds.height).toBeLessThanOrEqual(900);
        await expect(trigger.locator('..').locator('.premium-select-label')).toHaveAttribute('data-direction', direction);
        await page.keyboard.press('End'); await page.keyboard.press('Enter');
        await expect(trigger).toBeFocused();
        await trigger.click(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('Enter');
        await expect(trigger.locator('..').locator('.premium-select-label')).toHaveAttribute('data-floated', 'false');
        await trigger.click(); await page.keyboard.press('Tab');
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await trigger.click(); await page.mouse.click(2, 200);
        await expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await expect(page.getByRole('listbox')).toHaveCount(0);
      }
    }
    await page.getByTestId('order-qty-input').focus();
    const input = page.getByTestId('order-qty-input');
    expect(await input.evaluate(element => getComputedStyle(element).outlineStyle)).toBe('none');
    await input.hover(); await page.mouse.wheel(0, 180);
    await expect(input).toHaveValue('5000'); await expect(input).not.toBeFocused();
    expect(await input.evaluate(element => getComputedStyle(element).borderTopWidth)).toBe('0px');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: testInfo.outputPath(`light-${width}.png`) });
    await page.getByTestId('app-header').getByRole('button', { name: 'Switch to dark mode' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.screenshot({ path: testInfo.outputPath(`dark-${width}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('issued and revised PDF and CSV identify their saved versions', async ({ page, database }, testInfo) => {
  for (const [id, value] of Object.entries(fields)) await page.getByTestId(id).fill(value);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const fs = require('node:fs');
  const issued = [];
  for (const version of [1, 2]) {
    if (version === 2) await page.getByTestId('order-qty-input').fill('6000');
    const download = page.waitForEvent('download');
    await page.getByTestId('export-pdf-btn').click();
    const file = await download;
    const task = pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(await file.path())), useSystemFonts: false,
      standardFontDataUrl: require('node:path').join(require('node:path').dirname(require.resolve('pdfjs-dist/package.json')), 'standard_fonts') + '/' });
    const document = await task.promise;
    let text = '';
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) text += (await (await document.getPage(pageNumber)).getTextContent()).items.map(item => item.str).join(' ');
    const first = await document.getPage(1);
    const viewport = first.getViewport({ scale: 1.4 });
    const canvas = require('@napi-rs/canvas').createCanvas(viewport.width, viewport.height);
    await first.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    fs.writeFileSync(testInfo.outputPath(`quotation-v${version}.png`), canvas.toBuffer('image/png'));
    await task.destroy();
    const csvDownload = page.waitForEvent('download');
    await page.getByTestId('export-csv-btn').click();
    const csvFile = await csvDownload;
    const csv = fs.readFileSync(await csvFile.path(), 'utf8');
    const saved = database.quotations.find(quote => quote.version === version);
    issued.push({ pdfFilename: file.suggestedFilename(), csvFilename: csvFile.suggestedFilename(), version: saved.version, text, csv, number: saved.quote_number });
  }
  await testInfo.attach('document-identity', { body: JSON.stringify(issued), contentType: 'application/json' });
  expect(issued[0].number).toBe(issued[1].number);
  expect(issued[0].pdfFilename).not.toBe(issued[1].pdfFilename);
  expect(issued[0].csvFilename).not.toBe(issued[1].csvFilename);
  for (const item of issued) {
    expect(item.text).toContain(`Version ${item.version}`);
    expect(item.csv).toContain(item.number);
    expect(item.csv).toContain(`"Version","${item.version}"`);
  }
});

test('damaged recovery drafts are reported once and never overwritten', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('datpack_recovery_drafts', '{damaged audit data'));
  await page.reload();
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(page.getByRole('alert')).toContainText('original contents have been preserved');
  await page.getByRole('button', { name: 'Reload Clients', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('damaged');
  expect(await page.evaluate(() => localStorage.getItem('datpack_recovery_drafts'))).toBe('{damaged audit data');
});

test('incomplete and invalid numeric input cannot produce downloads', async ({ page, database }) => {
  const downloads = [];
  page.on('download', file => downloads.push(file));
  await page.getByTestId('export-pdf-btn').click();
  await expect(page.getByRole('alert')).toContainText('Enter a job name');
  for (const [id, value] of Object.entries(fields)) await page.getByTestId(id).fill(value);
  await openSections(page);
  for (const [id, value, message] of [['order-qty-input', '-1', 'nonnegative'], ['ups-per-sheet', '0.5', 'whole number'], ['margin-input', '100', 'below 100%']]) {
    const original = await page.getByTestId(id).inputValue();
    await page.getByTestId(id).fill(value);
    await page.getByTestId('export-csv-btn').click();
    await expect(page.getByRole('alert')).toContainText(message);
    await page.getByTestId(id).fill(original);
    await page.getByRole('button', { name: 'Dismiss error', exact: true }).click();
  }
  expect(downloads).toHaveLength(0);
  await page.getByRole('button', { name: 'Edit Total Paper Cost', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Override Total Paper Cost', exact: true }).fill('-200');
  await expect(page.getByRole('alert')).toContainText('nonnegative');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Dismiss error', exact: true }).click();
  await save(page);
  expect(database.quotations[0].state.overrides).toEqual({});
});

test('missing logo still exports and missing font fails visibly with CSV available', async ({ page }) => {
  for (const [id, value] of Object.entries(fields)) await page.getByTestId(id).fill(value);
  await page.route('**/*logo-copper*', route => route.abort());
  const pdfDownload = page.waitForEvent('download');
  await page.getByTestId('export-pdf-btn').click();
  expect(await (await pdfDownload).failure()).toBeNull();
  await page.route('**/*.ttf', route => route.fulfill({ status: 503, body: 'Synthetic font failure' }));
  await page.getByTestId('client-name-input').fill('\u0928\u092e\u0938\u094d\u0924\u0947');
  await page.getByTestId('export-pdf-btn').click();
  await expect(page.getByRole('alert')).toContainText('font could not be loaded');
  const csvDownload = page.waitForEvent('download');
  await page.getByTestId('export-csv-btn').click();
  expect(await (await csvDownload).failure()).toBeNull();
});

test('legacy weight review and unsupported future records preserve their originals', async ({ page, database }) => {
  for (const [id, value] of Object.entries(fields)) await page.getByTestId(id).fill(value);
  await save(page);
  const legacy = JSON.parse(JSON.stringify(database.quotations[0]));
  legacy.id = 'legacy-audit';
  delete legacy.state.pricingModelVersion;
  legacy.state.overrides = { totalWeight: 25 };
  database.quotations = [JSON.parse(JSON.stringify(legacy))];
  await page.reload();
  await expect(page.getByText('Legacy quotation - review required', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Load', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText(/previously ignored Total Paper Weight override/)).toBeVisible();
  await page.getByRole('button', { name: 'Use weight override', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reset Total Paper Weight (kg)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reset Total Paper Weight (kg)', exact: true }).click();
  await page.getByRole('button', { name: 'I reviewed the inputs; create a revised quotation', exact: true }).click();
  await save(page);
  expect(database.quotations.find(quote => quote.id === 'legacy-audit')).toEqual(legacy);
  const future = JSON.parse(JSON.stringify(legacy));
  future.state.pricingModelVersion = 999;
  database.quotations = [future];
  await page.reload();
  await expect(page.getByText('Unsupported quotation - original preserved', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Load', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Unsupported newer quotation model');
  expect(database.quotations[0].state.pricingModelVersion).toBe(999);
});