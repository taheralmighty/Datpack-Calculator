import { calcAll } from './calc';

export const exportCSV = (state) => {
  const calc = calcAll(state);
  const rows = [
    ['DatPack Co. Quotation Export', new Date().toLocaleString('en-IN')],
    [],
    ['SECTION 1 — JOB SPECIFICATIONS'],
    ['Client Name', state.clientName || ''],
    ['Job Name', state.jobName || ''],
    ['Order Quantity', state.orderQty || 0],
    ['Flat Size Length (mm)', state.flatLength || 0],
    ['Flat Size Width (mm)', state.flatWidth || 0],
    [],
    ['SECTION 2 — PAPER SPECIFICATIONS'],
    ['Master Sheet Length (mm)', state.masterLength || 0],
    ['Master Sheet Width (mm)', state.masterWidth || 0],
    ['Paper GSM', state.gsm || 0],
    [],
    ['SECTION 3 — LAYOUT & QUANTITY'],
    ['Ups per Sheet', calc.upsPerSheet],
    ['Net Sheets Required', calc.netSheets],
    ['Platen Wastage %', state.wastage || 5],
    ['Gross Sheets Needed', calc.grossSheets],
    [],
    ['SECTION 4 — PAPER COST'],
    ['Weight per Sheet (kg)', calc.weightPerSheet.toFixed(6)],
    ['Total Paper Weight (kg)', calc.totalWeight.toFixed(3)],
    ['Paper Rate per kg (₹)', state.paperRate || 0],
    ['Total Paper Cost (₹)', calc.paperCost.toFixed(2)],
    [],
    ['SECTION 5 — PRINTING & LAMINATION'],
    ['Total Impressions', calc.grossSheets],
    ['Click Charge per Sheet (₹)', state.clickCharge || 0],
    ['Total Print Cost (₹)', calc.printCost.toFixed(2)],
    ['Lam Rate per Sq. Inch (₹)', state.lamRate || 0],
    ['Sq. Inches per Sheet', calc.sqInPerSheet.toFixed(4)],
    ['Total Lamination Cost (₹)', calc.lamCost.toFixed(2)],
    [],
    ['SECTION 6 — PREMIUM FINISHES'],
    ['Foil Length (mm)', state.foilLength || 0],
    ['Foil Width (mm)', state.foilWidth || 0],
    ['Foil Block Rate per Sq. Inch (₹)', state.foilBlockRate || 0],
    ['Foiling Setup Cost (₹)', state.foilingSetup || 0],
    ['Foiling Run Rate per 1000 (₹)', state.foilingRunRate || 0],
    ['Foil Block Cost (₹)', calc.foilBlockCost.toFixed(2)],
    ['Total Foiling Cost (₹)', calc.foilingCost.toFixed(2)],
    ['UV Screen Cost (₹)', state.uvScreenCost || 0],
    ['UV Run Rate per 1000 (₹)', state.uvRunRate || 0],
    ['Total Spot UV Cost (₹)', calc.uvCost.toFixed(2)],
    [],
    ['SECTION 7 — FINISHING'],
    ['Punching Rate per 1000 (₹)', state.punchingRate || 0],
    ['Punching Setup Cost (₹)', state.punchingSetup || 0],
    ['Wooden Die Cost (₹)', state.dieCost || 0],
    ['Pasting Rate per Box (₹)', state.pastingRate || 0],
    ['Total Die-Cutting Cost (₹)', calc.dieCuttingCost.toFixed(2)],
    ['Total Pasting Cost (₹)', calc.pastingCost.toFixed(2)],
    [],
    ['SECTION 8 — FINAL SUMMARY'],
    ['Total Production Cost (₹)', calc.totalProductionCost.toFixed(2)],
    ['Cost Per Unit (₹)', calc.costPerUnit.toFixed(4)],
    ['Desired Profit Margin %', state.margin || 30],
    ['Selling Price Per Unit (₹)', calc.sellingPricePerUnit.toFixed(4)],
    ['Subtotal Quote Value (₹)', calc.subtotal.toFixed(2)],
    ['GST %', state.gst || 18],
    ['Final Total w/ GST (₹)', calc.finalTotal.toFixed(2)],
    [],
    ['SECTION 9 — REPEAT ORDER'],
    ['Is Repeat Order', state.isRepeatOrder ? 'Yes' : 'No'],
    ['One-Time Tooling Cost (₹)', calc.oneTimeTooling.toFixed(2)],
    ['Repeat Subtotal (₹)', calc.repeatSubtotal.toFixed(2)],
    ['Repeat Final Total w/ GST (₹)', calc.repeatFinalTotal.toFixed(2)],
  ];

  const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DatPack_Quote_${state._quoteNumber || 'Draft'}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
