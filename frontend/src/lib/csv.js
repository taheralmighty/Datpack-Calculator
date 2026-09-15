import Papa from 'papaparse';
import { calcAll, migrateState, documentPricing, MACHINE_SIZES, LAMINATION_OPTIONS, FOILING_SIZES, UV_OPTIONS, PASTING_OPTIONS } from './calc';
import { assertExportable } from './validation';

export const buildCSVRows = (saved, version = 1) => {
  const migrated = migrateState(saved);
  const state = migrated.issueSnapshot ? { ...migrated.issueSnapshot.state, _quoteNumber: migrated._quoteNumber } : migrated;
  const calc = migrated.issueSnapshot?.calc || calcAll(state);
  const pricing = documentPricing(state, calc);
  return [
    ['DatPack Co. Quotation Export', new Date().toLocaleString('en-IN')],
    ['Quotation Number', state._quoteNumber || 'Draft'],
    ['Version', version],
    [],
    ['SECTION 1 — JOB SPECIFICATIONS'],
    ['Client Name', state.clientName || ''],
    ['Job Name', state.jobName || ''],
    ['Order Quantity', state.orderQty || 0],
    ['Ups per Sheet', calc.upsPerSheet],
    [],
    ['SECTION 2 — PAPER SPECIFICATIONS'],
    ['Master Sheet Length (in)', state.masterLength || 0],
    ['Master Sheet Width (in)', state.masterWidth || 0],
    ['Paper GSM', state.gsm || 0],
    ['Paper Rate per kg (₹)', state.paperRate || 0],
    ['Platen Wastage %', Number(state.platenWastage || 0) * 100],
    [],
    ['SECTION 3 — PAPER COST'],
    ['Net Sheets Required', calc.netSheets],
    ['Gross Sheets Needed', calc.grossSheets],
    ['Total Paper Cost (₹)', calc.paperCost.toFixed(2)],
    [],
    ['SECTION 4 — PRINTING'],
    ['Machine Size', MACHINE_SIZES[state.machineSize]?.label || 'None'],
    ['Plate Cost (₹)', calc.plateCost],
    ['Print Price / 1000 (₹)', calc.printPrice],
    ['Number of Thousands', calc.numberOfThousands],
    ['Total Print Cost (₹)', calc.printCost.toFixed(2)],
    [],
    ['SECTION 5 — LAMINATION'],
    ['Lamination Type', LAMINATION_OPTIONS[state.laminationType]?.label || 'None'],
    ['Total Lamination Cost (₹)', calc.lamCost.toFixed(2)],
    [],
    ['SECTION 6 — FOILING'],
    ['Foiling Size', FOILING_SIZES[state.foilingSize]?.label || 'None'],
    ['Foiling Block Cost (₹)', calc.foilingBlockCost],
    ['Foiling Run Rate (₹)', calc.foilingRunRate],
    ['Total Foiling Cost (₹)', calc.foilingCost.toFixed(2)],
    [],
    ['SECTION 7 — UV'],
    ['UV Type', UV_OPTIONS[state.uvType]?.label || 'None'],
    ['UV Rate (₹)', calc.uvRate],
    ['Total UV Cost (₹)', calc.totalUVCost.toFixed(2)],
    [],
    ['SECTION 8 — DIE CUTTING'],
    ['Punch Cost (₹)', calc.punchCost],
    ['Punching Cost per 1000 (₹)', calc.punchingCostPer1000],
    ['Total Punching Cost (₹)', calc.totalPunchingCost.toFixed(2)],
    [],
    ['SECTION 9 — PASTING'],
    ['Type of Pasting', PASTING_OPTIONS[state.pastingType]?.label || 'None'],
    ['Total Pasting Cost (₹)', calc.pastingCost.toFixed(2)],
    [],
    ['SECTION 10 — FINAL SUMMARY & PRICING'],
    ['Total Production Cost (₹)', calc.totalProductionCost.toFixed(2)],
    ['Cost Per Unit (₹)', calc.costPerUnit.toFixed(4)],
    ['Desired Profit Margin %', Number(state.margin || 0) * 100],
    ['Selling Price Per Unit (₹)', pricing.unitPrice.toFixed(2)],
    ['Displayed Rate × Quantity (₹)', pricing.extension.toFixed(2)],
    ['Rate Rounding Adjustment (₹)', pricing.rateAdjustment.toFixed(2)],
    ['Subtotal Quote Value (₹)', calc.subtotal.toFixed(2)],
    ['GST %', Number(state.gst || 0) * 100],
    ['GST (₹)', calc.gstAmount.toFixed(2)],
    ['Final Total w/ GST (₹)', calc.finalTotal.toFixed(2)],
    ['Tax Rounding Adjustment (₹)', pricing.taxAdjustment.toFixed(2)],
    ['Issued Date', state.issuedAt || 'Not issued'],
    ['Revision Date', state.revisedAt || ''],
    [],
    ['COST BREAKDOWN'],
    ...calc.breakdown.map(item => [item.name, item.value.toFixed(2)]),
    ...(pricing.costAdjustment ? [['Cost Rounding Adjustment (₹)', pricing.costAdjustment.toFixed(2)]] : []),
  ];
};

export const exportCSV = (state, version = 1) => {
  assertExportable(migrateState(state));
  const csv = Papa.unparse(buildCSVRows(state, version), { quotes: true, escapeFormulae: true });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DatPack_Quote_${state._quoteNumber || 'Draft'}_v${version}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
