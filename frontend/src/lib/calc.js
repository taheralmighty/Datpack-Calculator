// ─── Indian Rupee Formatter ────────────────────────────
export const formatINR = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

// ─── Quote Number Generator ────────────────────────────
export const generateQuoteNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = String(Math.floor(Math.random() * 9000) + 1000);
  return `QT-${date}-${suffix}`;
};

// ─── State Migration ──────────────────────────────────
const DEFAULT_STATE = {
  clientName: '', jobName: '', orderQty: '',
  flatLength: '', flatWidth: '',
  masterLength: '', masterWidth: '', gsm: '',
  upsPerSheet: '', netSheets: '', wastage: 5, grossSheets: '',
  weightPerSheet: '', totalWeight: '', paperRate: '',
  clickCharge: '', lamRate: '',
  foilLength: '', foilWidth: '', foilBlockRate: '', foilingSetup: '', foilingRunRate: '',
  uvScreenCost: '', uvRunRate: '',
  punchingRate: '', punchingSetup: '', dieCost: '', pastingRate: '',
  margin: 30, gst: 18,
  isRepeatOrder: false,
  overrides: {},
};

export const migrateState = (saved) => {
  if (!saved) return DEFAULT_STATE;
  return { ...DEFAULT_STATE, ...saved };
};

export const getDefaultState = () => ({ ...DEFAULT_STATE });

// ─── Calculation Helpers ──────────────────────────────
const n = (v) => parseFloat(v) || 0;

export const calcUpsPerSheet = (masterL, masterW, flatL, flatW) => {
  if (!masterL || !masterW || !flatL || !flatW) return 0;
  return Math.floor(n(masterL) / n(flatL)) * Math.floor(n(masterW) / n(flatW));
};

export const calcNetSheets = (orderQty, ups) => {
  if (!ups || !orderQty) return 0;
  return Math.ceil(n(orderQty) / n(ups));
};

export const calcGrossSheets = (netSheets, wastage) => {
  return Math.ceil(n(netSheets) * (1 + n(wastage) / 100));
};

export const calcWeightPerSheet = (masterL, masterW, gsm) => {
  if (!masterL || !masterW || !gsm) return 0;
  return (n(masterL) * n(masterW) * n(gsm)) / 1550000;
};

export const calcTotalWeight = (grossSheets, weightPerSheet) => n(grossSheets) * n(weightPerSheet);

export const calcPaperCost = (totalWeight, paperRate) => n(totalWeight) * n(paperRate);

export const calcPrintCost = (grossSheets, clickCharge) => n(grossSheets) * n(clickCharge);

export const calcSqInPerSheet = (masterL, masterW) => (n(masterL) * n(masterW)) / 645.16;

export const calcLamCost = (grossSheets, sqIn, lamRate) => n(grossSheets) * n(sqIn) * n(lamRate);

export const calcFoilBlockCost = (foilL, foilW, blockRate) => ((n(foilL) * n(foilW)) / 645.16) * n(blockRate);

export const calcTotalFoilingCost = (grossSheets, runRate, setup, blockCost) =>
  ((n(grossSheets) / 1000) * n(runRate)) + n(setup) + n(blockCost);

export const calcSpotUVCost = (grossSheets, uvRunRate, uvScreenCost) =>
  ((n(grossSheets) / 1000) * n(uvRunRate)) + n(uvScreenCost);

export const calcDieCuttingCost = (grossSheets, punchingRate, punchingSetup, dieCost) =>
  ((n(grossSheets) / 1000) * n(punchingRate)) + n(punchingSetup) + n(dieCost);

export const calcPastingCost = (orderQty, pastingRate) => n(orderQty) * n(pastingRate);

export const calcAll = (state) => {
  const s = state;
  const o = s.overrides || {};

  const upsPerSheet = o.upsPerSheet != null ? n(o.upsPerSheet) : calcUpsPerSheet(s.masterLength, s.masterWidth, s.flatLength, s.flatWidth);
  const netSheets = o.netSheets != null ? n(o.netSheets) : calcNetSheets(s.orderQty, upsPerSheet);
  const grossSheets = o.grossSheets != null ? n(o.grossSheets) : calcGrossSheets(netSheets, s.wastage);
  const weightPerSheet = o.weightPerSheet != null ? n(o.weightPerSheet) : calcWeightPerSheet(s.masterLength, s.masterWidth, s.gsm);
  const totalWeight = o.totalWeight != null ? n(o.totalWeight) : calcTotalWeight(grossSheets, weightPerSheet);

  const paperCost = calcPaperCost(totalWeight, s.paperRate);
  const printCost = calcPrintCost(grossSheets, s.clickCharge);
  const sqInPerSheet = calcSqInPerSheet(s.masterLength, s.masterWidth);
  const lamCost = calcLamCost(grossSheets, sqInPerSheet, s.lamRate);
  const foilBlockCost = calcFoilBlockCost(s.foilLength, s.foilWidth, s.foilBlockRate);
  const foilingCost = calcTotalFoilingCost(grossSheets, s.foilingRunRate, s.foilingSetup, foilBlockCost);
  const uvCost = calcSpotUVCost(grossSheets, s.uvRunRate, s.uvScreenCost);
  const dieCuttingCost = calcDieCuttingCost(grossSheets, s.punchingRate, s.punchingSetup, s.dieCost);
  const pastingCost = calcPastingCost(s.orderQty, s.pastingRate);

  const totalProductionCost = paperCost + printCost + lamCost + foilingCost + uvCost + dieCuttingCost + pastingCost;
  const costPerUnit = n(s.orderQty) > 0 ? totalProductionCost / n(s.orderQty) : 0;
  const sellingPricePerUnit = n(s.margin) < 100 ? costPerUnit / (1 - n(s.margin) / 100) : 0;
  const subtotal = sellingPricePerUnit * n(s.orderQty);
  const finalTotal = subtotal * (1 + n(s.gst) / 100);

  const oneTimeTooling = foilBlockCost + n(s.uvScreenCost) + n(s.dieCost);
  const repeatSubtotal = subtotal - oneTimeTooling;
  const repeatFinalTotal = repeatSubtotal * (1 + n(s.gst) / 100);

  return {
    upsPerSheet, netSheets, grossSheets, weightPerSheet, totalWeight,
    paperCost, printCost, sqInPerSheet, lamCost,
    foilBlockCost, foilingCost, uvCost, dieCuttingCost, pastingCost,
    totalProductionCost, costPerUnit, sellingPricePerUnit, subtotal, finalTotal,
    oneTimeTooling, repeatSubtotal, repeatFinalTotal,
    breakdown: [
      { name: 'Paper', value: paperCost },
      { name: 'Printing', value: printCost },
      { name: 'Lamination', value: lamCost },
      { name: 'Foiling', value: foilingCost },
      { name: 'Spot UV', value: uvCost },
      { name: 'Die-Cutting', value: dieCuttingCost },
      { name: 'Pasting', value: pastingCost },
    ].filter(b => b.value > 0),
  };
};
