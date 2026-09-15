import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { buildCSVRows, exportCSV } from './csv';
import { generatePDF } from './pdf';
import { calcAll, getDefaultState, documentPricing } from './calc';

jest.mock('jspdf', () => ({ jsPDF: jest.fn() }));
jest.mock('jspdf-autotable', () => jest.fn());

const state = {
  ...getDefaultState(), jobName: 'Box, "Premium"', orderQty: 5000, upsPerSheet: 4,
  masterLength: 20, masterWidth: 28, gsm: 300, paperRate: 120,
  machineSize: 'size3', laminationType: 'thermal_matte', foilingSize: 'large', uvType: 'emboss_uv', pastingType: 'envelope',
};

test('CSV exports all selections and seven costs using the same calculation object', () => {
  const rows = buildCSVRows(state);
  expect(rows).toContainEqual(['SECTION 4 — PRINTING']);
  expect(rows).toContainEqual(['SECTION 6 — FOILING']);
  expect(rows).toContainEqual(['SECTION 9 — PASTING']);
  const fields = Object.fromEntries(rows.filter(row => row.length === 2));
  const calc = calcAll(state);
  expect(fields['Machine Size']).toBe('Size 3');
  expect(fields['Lamination Type']).toBe('Thermal - Matte');
  expect(fields['Foiling Size']).toBe('Large');
  expect(fields['UV Type']).toBe('Emboss UV');
  expect(fields['Type of Pasting']).toBe('Envelope');
  expect(fields['Platen Wastage %']).toBe(5);
  expect(fields['Desired Profit Margin %']).toBe(20);
  expect(fields['GST %']).toBe(18);
  expect(fields['Total Production Cost (₹)']).toBe(calc.totalProductionCost.toFixed(2));
  expect(fields['Final Total w/ GST (₹)']).toBe(calc.grandTotal.toFixed(2));
  calc.breakdown.forEach(item => expect(fields[item.name]).toBe(item.value.toFixed(2)));
  expect(JSON.stringify(rows)).not.toMatch(/repeat|tooling|click charge|flat size|impressions/i);
});

test.each([
  ['regular_glass', 'Regular - Gloss', 0.4],
  ['thermal_glass', 'Thermal - Gloss', 0.7],
])('saved lamination selection %s uses the corrected gloss label and unchanged rate', (laminationType, label, rate) => {
  const saved = { ...state, laminationType };
  expect(buildCSVRows(saved)).toContainEqual(['Lamination Type', label]);
  expect(calcAll(saved).laminationCost).toBe(rate);
});

test('CSV download preserves quoted text, zeros and legacy migration', async () => {
  let blob;
  URL.createObjectURL = jest.fn(value => { blob = value; return 'blob:test'; });
  URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  exportCSV({ ...state, margin: 0, gst: 0 });
  const text = await new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsText(blob);
  });
  const fields = Object.fromEntries(Papa.parse(text).data.filter(row => row.length === 2));
  expect(fields['Job Name']).toBe(state.jobName);
  expect(fields['GST %']).toBe('0');
  expect(fields['Desired Profit Margin %']).toBe('0');
  expect(click).toHaveBeenCalled();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  click.mockRestore();
  expect(buildCSVRows({ orderQty: 1000, overrides: { upsPerSheet: 4 }, isRepeatOrder: true })).toContainEqual(['Ups per Sheet', 4]);
});

test('PDF tables reconcile with calcAll and contain no repeat pricing or obsolete inputs', async () => {
  const doc = {
    internal: { pageSize: { getHeight: () => 297 } }, lastAutoTable: { finalY: 100 },
  };
  ['setTextColor', 'setDrawColor', 'setFillColor', 'setLineWidth', 'setFont', 'setFontSize', 'setCharSpace', 'text', 'rect', 'line', 'roundedRect', 'addImage', 'addPage', 'save'].forEach(method => { doc[method] = jest.fn(); });
  jsPDF.mockImplementation(() => doc);
  autoTable.mockClear();
  await generatePDF({ ...state, gst: 0, margin: 0, isRepeatOrder: true }, { name: 'Test Client' }, 'test-logo');
  const tables = autoTable.mock.calls.map(call => call[1].body);
  const costs = tables[1];
  expect(costs.map(row => row[0])).toEqual(['Paper', 'Printing', 'Lamination', 'Foiling', 'UV', 'Die-Cutting', 'Pasting', 'Total Production Cost', 'Margin Applied']);
  expect(costs[costs.length - 1]).toEqual(['Margin Applied', '0%']);
  expect(tables[2][1][0]).toBe('GST (0%)');
  const calc = calcAll({ ...state, gst: 0, margin: 0 });
  const money = value => 'Rs. ' + value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  expect(tables[2][2][1]).toBe(money(calc.grandTotal));
  expect(costs[7][1]).toBe(money(calc.totalProductionCost));
  expect(JSON.stringify([tables, doc.text.mock.calls])).not.toMatch(/repeat|tooling|flat size|click charge/i);
  expect(doc.save).toHaveBeenCalledWith(expect.stringMatching(/\.pdf$/));
});

test.each([1, 3, 1000, 5000, 99999])('document rounding reconciles the displayed rate, quantity and totals for %s pieces', orderQty => {
  const quote = { ...state, orderQty };
  const pricing = documentPricing(quote);
  expect(pricing.unitPrice * orderQty + pricing.rateAdjustment).toBeCloseTo(pricing.subtotal, 8);
  expect(pricing.subtotal + pricing.gst + pricing.taxAdjustment).toBeCloseTo(pricing.grandTotal, 8);
  expect(pricing.costs.reduce((total, cost) => total + cost.value, pricing.costAdjustment))
    .toBeCloseTo(Number(calcAll(quote).totalProductionCost.toFixed(2)), 8);
});