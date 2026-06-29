// ─── Indian Rupee Formatter ────────────────────────────
export const formatINR = (value) => {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value) || value === 0) return '₹—';
  return '₹' + value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ─── Quote Number Generator ────────────────────────────
export const generateQuoteNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = String(Math.floor(Math.random() * 9000) + 1000);
  return `QT-${date}-${suffix}`;
};

// ─── Default State ────────────────────────────────────
const DEFAULT_STATE = {
  // Section 1 — Job Specifications
  clientName: '', jobName: '', orderQty: 0,
  // Section 2 — Paper Specifications (all dimensions in INCHES)
  flatLength: 0, flatWidth: 0,
  masterLength: 0, masterWidth: 0, gsm: 0,
  // Section 3 — Layout & Quantity
  platenWastage: 0.05, // stored as decimal (0.05 = 5%)
  upsOverride: null,
  // Section 4 — Paper Cost
  paperRate: 0,
  // Section 5 — Printing & Lamination
  clickCharge: 0, lamRate: 0,
  // Section 6 — Premium Finishes (dimensions in INCHES)
  foilLength: 0, foilWidth: 0, foilBlockRate: 0, foilingSetup: 0, foilingRunRate: 0,
  uvScreenCost: 0, uvRunRate: 0,
  // Section 7 — Finishing
  punchingRate: 0, punchingSetup: 0, woodenDieCost: 0, pastingRate: 0,
  // Section 8 — Pricing (stored as decimals: 0.20 = 20%)
  margin: 0.20, gst: 0.18,
  // Section 9 — Repeat Order
  isRepeatOrder: false,
  overrides: {},
};

export const migrateState = (saved) => {
  if (!saved) return { ...DEFAULT_STATE };
  const migrated = { ...DEFAULT_STATE, ...saved };
  // Migrate old field names to new ones
  if ('wastage' in saved && !('platenWastage' in saved)) {
    const w = parseFloat(saved.wastage);
    migrated.platenWastage = w > 1 ? w / 100 : (w || 0.05);
    delete migrated.wastage;
  }
  if ('dieCost' in saved && !('woodenDieCost' in saved)) {
    migrated.woodenDieCost = saved.dieCost;
    delete migrated.dieCost;
  }
  // Migrate margin/gst from percentage to decimal if needed
  if (parseFloat(migrated.margin) > 1) migrated.margin = parseFloat(migrated.margin) / 100;
  if (parseFloat(migrated.gst) > 1) migrated.gst = parseFloat(migrated.gst) / 100;
  return migrated;
};

export const getDefaultState = () => ({ ...DEFAULT_STATE });

// ─── Calculation Helpers ──────────────────────────────
const n = (v) => { const num = parseFloat(v); return isNaN(num) || !isFinite(num) ? 0 : num; };
const safe = (result) => (isNaN(result) || !isFinite(result) ? 0 : result);

export const calcUpsPerSheet = (masterL, masterW, flatL, flatW) => {
  if (!n(flatL) || !n(flatW)) return 0;
  return Math.floor(n(masterL) / n(flatL)) * Math.floor(n(masterW) / n(flatW));
};

export const calcNetSheets = (orderQty, ups) => {
  if (!n(ups)) return 0;
  return Math.ceil(n(orderQty) / n(ups));
};

// platenWastage is stored as decimal (0.05 = 5%) — no /100 needed
export const calcGrossSheets = (netSheets, platenWastage) => {
  return Math.ceil(n(netSheets) * (1 + n(platenWastage)));
};

export const calcWeightPerSheet = (masterL, masterW, gsm) => {
  if (!masterL || !masterW || !gsm) return 0;
  return (n(masterL) * n(masterW) * n(gsm)) / 1550000;
};

export const calcTotalWeight = (grossSheets, weightPerSheet) => n(grossSheets) * n(weightPerSheet);

export const calcPaperCost = (totalWeight, paperRate) => n(totalWeight) * n(paperRate);

export const calcPrintCost = (grossSheets, clickCharge) => n(grossSheets) * n(clickCharge);

// sqInchesPerSheet uses FLAT SIZE dimensions in inches — no conversion factor
export const calcSqInPerSheet = (flatL, flatW) => n(flatL) * n(flatW);

export const calcLamCost = (grossSheets, sqIn, lamRate) => n(grossSheets) * n(sqIn) * n(lamRate);

// foilBlockCost: dimensions in inches — no conversion factor
export const calcFoilBlockCost = (foilL, foilW, blockRate) => n(foilL) * n(foilW) * n(blockRate);

export const calcTotalFoilingCost = (grossSheets, runRate, setup, blockCost) =>
  ((n(grossSheets) / 1000) * n(runRate)) + n(setup) + n(blockCost);

export const calcSpotUVCost = (grossSheets, uvRunRate, uvScreenCost) =>
  ((n(grossSheets) / 1000) * n(uvRunRate)) + n(uvScreenCost);

export const calcDieCuttingCost = (grossSheets, punchingRate, punchingSetup, woodenDieCost) =>
  ((n(grossSheets) / 1000) * n(punchingRate)) + n(punchingSetup) + n(woodenDieCost);

export const calcPastingCost = (orderQty, pastingRate) => n(orderQty) * n(pastingRate);

export const calcAll = (state) => {
  const s = state;
  const o = s.overrides || {};

  // Section 3 — Layout
  const upsPerSheet = o.upsPerSheet != null
    ? n(o.upsPerSheet)
    : safe(calcUpsPerSheet(s.masterLength, s.masterWidth, s.flatLength, s.flatWidth));
  const netSheets = o.netSheets != null
    ? n(o.netSheets)
    : safe(calcNetSheets(s.orderQty, upsPerSheet));
  const grossSheets = o.grossSheets != null
    ? n(o.grossSheets)
    : safe(calcGrossSheets(netSheets, s.platenWastage));

  // Section 4 — Paper Cost
  const weightPerSheet = o.weightPerSheet != null
    ? n(o.weightPerSheet)
    : safe(calcWeightPerSheet(s.masterLength, s.masterWidth, s.gsm));
  const totalPaperWeight = o.totalPaperWeight != null
    ? n(o.totalPaperWeight)
    : safe(calcTotalWeight(grossSheets, weightPerSheet));
  const totalPaperCost = o.totalPaperCost != null
    ? n(o.totalPaperCost)
    : safe(calcPaperCost(totalPaperWeight, s.paperRate));

  // Section 5 — Print & Lamination
  const totalImpressions = grossSheets;
  const totalPrintCost = o.totalPrintCost != null
    ? n(o.totalPrintCost)
    : safe(calcPrintCost(grossSheets, s.clickCharge));
  const sqInchesPerSheet = o.sqInchesPerSheet != null
    ? n(o.sqInchesPerSheet)
    : safe(calcSqInPerSheet(s.flatLength, s.flatWidth));
  const totalLamCost = o.totalLamCost != null
    ? n(o.totalLamCost)
    : safe(calcLamCost(grossSheets, sqInchesPerSheet, s.lamRate));

  // Section 6 — Premium Finishes
  const foilBlockCost = o.foilBlockCost != null
    ? n(o.foilBlockCost)
    : safe(calcFoilBlockCost(s.foilLength, s.foilWidth, s.foilBlockRate));
  const totalFoilingCost = o.totalFoilingCost != null
    ? n(o.totalFoilingCost)
    : safe(calcTotalFoilingCost(grossSheets, s.foilingRunRate, s.foilingSetup, foilBlockCost));
  const totalSpotUVCost = o.totalSpotUVCost != null
    ? n(o.totalSpotUVCost)
    : safe(calcSpotUVCost(grossSheets, s.uvRunRate, s.uvScreenCost));

  // Section 7 — Finishing
  const totalDieCuttingCost = o.totalDieCuttingCost != null
    ? n(o.totalDieCuttingCost)
    : safe(calcDieCuttingCost(grossSheets, s.punchingRate, s.punchingSetup, s.woodenDieCost));
  const totalPastingCost = o.totalPastingCost != null
    ? n(o.totalPastingCost)
    : safe(calcPastingCost(s.orderQty, s.pastingRate));

  // Section 8 — Summary
  // ⚠ Foiling & Spot UV are premium add-ons shown separately — NOT in base production cost
  const totalProductionCost = safe(totalPaperCost + totalPrintCost + totalLamCost + totalDieCuttingCost + totalPastingCost);

  const orderQty = n(s.orderQty);
  const margin = n(s.margin);  // decimal e.g. 0.20
  const gst = n(s.gst);        // decimal e.g. 0.18

  const costPerUnit = orderQty > 0 ? safe(totalProductionCost / orderQty) : 0;
  const sellingPricePerUnit = (1 - margin) > 0 ? safe(costPerUnit / (1 - margin)) : 0;
  const totalQuoteValue = safe(sellingPricePerUnit * orderQty);
  const gstAmount = safe(totalQuoteValue * gst);
  const grandTotal = safe(totalQuoteValue * (1 + gst));

  // Section 9 — Repeat Order
  const oneTimeTooling = safe(foilBlockCost + n(s.uvScreenCost) + n(s.woodenDieCost));
  const repeatProductionCost = safe(totalProductionCost - oneTimeTooling);
  const repeatCostPerUnit = orderQty > 0 ? safe(repeatProductionCost / orderQty) : 0;
  const repeatSellingPricePerUnit = (1 - margin) > 0 ? safe(repeatCostPerUnit / (1 - margin)) : 0;
  const repeatQuoteValue = safe(repeatSellingPricePerUnit * orderQty);
  const repeatGSTAmount = safe(repeatQuoteValue * gst);
  const repeatGrandTotal = safe(repeatQuoteValue * (1 + gst));

  return {
    // Layout
    upsPerSheet, netSheets, grossSheets,
    // Paper
    weightPerSheet, totalPaperWeight, totalPaperCost,
    // Print & Lam
    totalImpressions, totalPrintCost, sqInchesPerSheet, totalLamCost,
    // Finishes
    foilBlockCost, totalFoilingCost, totalSpotUVCost,
    // Finishing
    totalDieCuttingCost, totalPastingCost,
    // Summary
    totalProductionCost, costPerUnit, sellingPricePerUnit, totalQuoteValue, gstAmount, grandTotal,
    // Repeat Order
    oneTimeTooling, repeatProductionCost, repeatCostPerUnit, repeatSellingPricePerUnit,
    repeatQuoteValue, repeatGSTAmount, repeatGrandTotal,
    // Backward-compat aliases so existing section components keep working
    paperCost: totalPaperCost,
    printCost: totalPrintCost,
    lamCost: totalLamCost,
    foilingCost: totalFoilingCost,
    uvCost: totalSpotUVCost,
    dieCuttingCost: totalDieCuttingCost,
    pastingCost: totalPastingCost,
    totalWeight: totalPaperWeight,
    sqInPerSheet: sqInchesPerSheet,
    subtotal: totalQuoteValue,
    finalTotal: grandTotal,
    repeatSubtotal: repeatQuoteValue,
    repeatFinalTotal: repeatGrandTotal,
    // Cost breakdown for chart
    breakdown: [
      { name: 'Paper', value: totalPaperCost },
      { name: 'Printing', value: totalPrintCost },
      { name: 'Lamination', value: totalLamCost },
      { name: 'Foiling', value: totalFoilingCost },
      { name: 'Spot UV', value: totalSpotUVCost },
      { name: 'Die-Cutting', value: totalDieCuttingCost },
      { name: 'Pasting', value: totalPastingCost },
    ].filter(b => b.value > 0),
  };
};
