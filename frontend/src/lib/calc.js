// ─── Indian Rupee Formatter ────────────────────────────
export const formatINR = (value) => {
  if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return '₹—';
  return '₹' + value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ─── Quote Number Generator ────────────────────────────
export const generateQuoteNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
  return `QT-${date}-${suffix}`;
};

export const MACHINE_SIZES = {
  size1: { label: 'Size 1', length: 18, width: 25, plateCost: 1200, printPrice: 1500, punchCost: 1500, punchingCostPer1000: 400 },
  size2: { label: 'Size 2', length: 20, width: 28, plateCost: 1500, printPrice: 1800, punchCost: 2000, punchingCostPer1000: 450 },
  size3: { label: 'Size 3', length: 25, width: 36, plateCost: 2400, printPrice: 3200, punchCost: 2500, punchingCostPer1000: 600 },
  size4: { label: 'Size 4', length: 28, width: 40, plateCost: 3000, printPrice: 3500, punchCost: 3000, punchingCostPer1000: 700 },
};

export const LAMINATION_OPTIONS = {
  regular_glass: { label: 'Regular - Gloss', rate: 0.4 },
  regular_matte: { label: 'Regular - Matte', rate: 0.5 },
  regular_velvet: { label: 'Regular - Velvet', rate: 1.25 },
  thermal_glass: { label: 'Thermal - Gloss', rate: 0.7 },
  thermal_matte: { label: 'Thermal - Matte', rate: 0.8 },
  thermal_velvet: { label: 'Thermal - Velvet', rate: 2.25 },
};

export const FOILING_SIZES = {
  small: { label: 'Small', blockCost: 1000, runRate: 1500 },
  medium: { label: 'Medium', blockCost: 1750, runRate: 2500 },
  large: { label: 'Large', blockCost: 2500, runRate: 3500 },
  xl: { label: 'XL', blockCost: 4000, runRate: 5000 },
};

export const UV_OPTIONS = {
  spot_uv: { label: 'Spot UV', rate: 2000 },
  emboss_uv: { label: 'Emboss UV', rate: 4000 },
};

export const PASTING_OPTIONS = {
  side_pasting: { label: 'Side Pasting', rate: 0.25 },
  auto_locking: { label: 'Auto Locking', rate: 0.5 },
  envelope: { label: 'Envelope', rate: 2.5 },
  paper_bag_small: { label: 'Paper Bag Small', rate: 3 },
  paper_bag_medium: { label: 'Paper Bag Medium', rate: 4 },
  paper_bag_large: { label: 'Paper Bag Large', rate: 5 },
  ribbon_paper_bag: { label: 'Ribbon Paper Bag', rate: 12 },
};

export const FORMULAS = {
  netSheets: 'RoundUp(Order Quantity ÷ Ups per Sheet)',
  grossSheets: 'RoundUp(Net Sheets Required × (1 + Platen Wastage %))',
  totalPaperCost: 'Total Paper Weight × Paper Rate per kg',
  machine: 'Automatically selected from Machine Size',
  numberOfThousands: '0 for no sheets; 1 up to 1,200 sheets, then one additional tier per 1,000 sheets (rounded up)',
  totalPrintCost: 'Plate Cost + Number of Thousands × Print Price',
  totalLamCost: 'Gross Sheets × Master Sheet Length × Master Sheet Width × Lamination Cost ÷ 100',
  foiling: 'Automatically selected from Foiling Size',
  totalFoilingCost: 'Foiling Block Cost + Number of Thousands × Foiling Run Rate',
  uv: 'Automatically selected from UV Type',
  totalSpotUVCost: 'Number of Thousands × UV Type Rate',
  punching: 'Automatically selected from Printing Machine Size',
  totalDieCuttingCost: 'Punch Cost + Number of Thousands × Punching Cost per 1000',
  totalPastingCost: 'Order Quantity × Pasting Rate',
  totalProductionCost: 'Total Paper Cost + Total Print Cost + Total Lamination Cost + Total Foiling Cost + Total UV Cost + Total Punching Cost + Total Pasting Cost',
  costPerUnit: 'Total Production Cost ÷ Order Quantity',
  sellingPricePerUnit: 'Cost Per Unit ÷ (1 - Desired Profit Margin)',
  totalQuoteValue: 'Selling Price / Unit × Order Quantity',
  gstAmount: 'Subtotal Quote Value × GST',
  grandTotal: 'Subtotal Quote Value × (1 + GST)',
};

export const MODEL_VERSION = 2;
const DEFAULT_STATE = {
  pricingModelVersion: MODEL_VERSION,
  clientName: '', jobName: '', orderQty: 0, upsPerSheet: 0,
  masterLength: 0, masterWidth: 0, gsm: 0, paperRate: 0,
  platenWastage: 0.05,
  machineSize: '', laminationType: '', foilingSize: '', uvType: '', pastingType: '',
  margin: 0.20, gst: 0.18,
  overrides: {}, legacyState: null, _quoteNumber: null, migrationReview: null,
  issuedAt: null, revisedAt: null,
  issueSnapshot: null,
};

const OVERRIDE_KEYS = [
  'netSheets', 'grossSheets', 'weightPerSheet', 'totalPaperWeight', 'totalPaperCost',
  'totalPrintCost', 'totalLamCost', 'totalFoilingCost', 'totalSpotUVCost',
  'totalDieCuttingCost', 'totalPastingCost',
];

export const migrateState = (saved) => {
  if (!saved || typeof saved !== 'object') return getDefaultState();
  if (Number(saved.pricingModelVersion) > MODEL_VERSION) throw new Error('Unsupported newer quotation model. The original record has not been changed.');
  const migrated = getDefaultState();
  Object.keys(DEFAULT_STATE).forEach(key => {
    if (saved[key] !== undefined) migrated[key] = saved[key];
  });
  const legacy = saved.pricingModelVersion !== MODEL_VERSION;
  const overrides = { ...(saved.overrides || {}) };
  if (legacy) {
    migrated.legacyState = saved.legacyState || JSON.parse(JSON.stringify(saved));
    migrated.migrationReview = saved.migrationReview || {
      required: true,
      percentageFormat: 'wastage' in saved ? 'percent' : 'platenWastage' in saved ? 'decimal' : overrides.totalWeight != null ? 'percent' : 'ambiguous',
      message: 'This legacy record is preserved. Review selections, percentages and overrides before issuing a current-model revision.',
    };
    migrated.upsPerSheet = overrides.upsPerSheet ?? saved.upsPerSheet ??
      safe(calcUpsPerSheet(saved.masterLength, saved.masterWidth, saved.flatLength, saved.flatWidth));
    if (overrides.totalPaperWeight == null && overrides.totalWeight != null) {
      if ('platenWastage' in saved && !('wastage' in saved)) {
        migrated.migrationReview = { ...migrated.migrationReview, pendingWeightOverride: overrides.totalWeight };
      } else overrides.totalPaperWeight = overrides.totalWeight;
    }
  }
  migrated.overrides = Object.fromEntries(OVERRIDE_KEYS
    .filter(key => overrides[key] != null)
    .map(key => [key, overrides[key]]));
  if ('wastage' in saved && !('platenWastage' in saved)) {
    const wastage = n(saved.wastage);
    migrated.platenWastage = wastage / 100;
  }
  if (legacy) {
    if (migrated.migrationReview.percentageFormat === 'percent') {
      ['margin', 'gst'].forEach(key => { if (saved[key] != null) migrated[key] = n(saved[key]) / 100; });
    }
  }
  migrated.pricingModelVersion = MODEL_VERSION;
  migrated._quoteNumber = saved._quoteNumber || saved.quoteNumber || null;
  return migrated;
};

export const getDefaultState = () => ({ ...DEFAULT_STATE, overrides: {} });

export const quotationPreview = quotation => {
  try {
    const state = migrateState(quotation.state || {});
    if (state.migrationReview?.required) return { label: 'Legacy quotation - review required', total: null };
    const total = state.issueSnapshot?.calc?.grandTotal ?? calcAll(state).grandTotal;
    return { label: formatINR(total), total };
  } catch {
    return { label: 'Unsupported quotation - original preserved', total: null };
  }
};

// ─── Calculation Helpers ──────────────────────────────
const n = (v) => { const num = typeof v === 'number' || typeof v === 'string' ? Number(v) : NaN; return Number.isFinite(num) ? num : 0; };
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

export const calcNumberOfThousands = (grossSheets) => {
  const sheets = n(grossSheets);
  if (sheets <= 0) return 0;
  if (sheets <= 1200) return 1;
  return 1 + Math.ceil((sheets - 1200) / 1000);
};

export const calcPrintCost = (numberOfThousands, plateCost, printPrice) =>
  n(plateCost) + n(numberOfThousands) * n(printPrice);

export const calcLamCost = (grossSheets, masterLength, masterWidth, laminationCost) =>
  n(grossSheets) * n(masterLength) * n(masterWidth) * n(laminationCost) / 100;

export const calcTotalFoilingCost = (numberOfThousands, blockCost, runRate) =>
  n(blockCost) + n(numberOfThousands) * n(runRate);

export const calcSpotUVCost = (numberOfThousands, uvRate) => n(numberOfThousands) * n(uvRate);

export const calcDieCuttingCost = (numberOfThousands, punchCost, punchingCostPer1000) =>
  n(punchCost) + n(numberOfThousands) * n(punchingCostPer1000);

export const calcPastingCost = (orderQty, pastingRate) => n(orderQty) * n(pastingRate);

export const documentPricing = (state, calc = calcAll(state)) => {
  const cents = value => Math.round((n(value) + Number.EPSILON) * 100);
  const unitCents = cents(calc.sellingPricePerUnit);
  const subtotalCents = cents(calc.totalQuoteValue);
  const gstCents = cents(calc.gstAmount);
  const grandCents = cents(calc.grandTotal);
  const extensionCents = unitCents * n(state.orderQty);
  const roundedCosts = calc.breakdown.map(item => ({ ...item, value: cents(item.value) / 100 }));
  return {
    unitPrice: unitCents / 100, extension: extensionCents / 100,
    rateAdjustment: (subtotalCents - extensionCents) / 100,
    subtotal: subtotalCents / 100, gst: gstCents / 100, grandTotal: grandCents / 100,
    taxAdjustment: (grandCents - subtotalCents - gstCents) / 100,
    costAdjustment: (cents(calc.totalProductionCost) - roundedCosts.reduce((total, item) => total + cents(item.value), 0)) / 100,
    costs: roundedCosts,
  };
};

export const calcAll = (state = {}) => {
  const s = state?.pricingModelVersion === MODEL_VERSION ? state : migrateState(state);
  const o = s.overrides || {};

  const upsPerSheet = n(s.upsPerSheet);
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

  const machine = Object.hasOwn(MACHINE_SIZES, s.machineSize) ? MACHINE_SIZES[s.machineSize] : {};
  const machineLength = n(machine.length);
  const machineWidth = n(machine.width);
  const plateCost = n(machine.plateCost);
  const printPrice = n(machine.printPrice);
  const punchCost = n(machine.punchCost);
  const punchingCostPer1000 = n(machine.punchingCostPer1000);
  const numberOfThousands = calcNumberOfThousands(grossSheets);
  const totalPrintCost = o.totalPrintCost != null
    ? n(o.totalPrintCost)
    : safe(calcPrintCost(numberOfThousands, plateCost, printPrice));
  const laminationCost = n(LAMINATION_OPTIONS[s.laminationType]?.rate);
  const totalLamCost = o.totalLamCost != null
    ? n(o.totalLamCost)
    : safe(calcLamCost(grossSheets, s.masterLength, s.masterWidth, laminationCost));

  const foilingBlockCost = n(FOILING_SIZES[s.foilingSize]?.blockCost);
  const foilingRunRate = n(FOILING_SIZES[s.foilingSize]?.runRate);
  const totalFoilingCost = o.totalFoilingCost != null
    ? n(o.totalFoilingCost)
    : safe(calcTotalFoilingCost(numberOfThousands, foilingBlockCost, foilingRunRate));
  const uvRate = n(UV_OPTIONS[s.uvType]?.rate);
  const totalSpotUVCost = o.totalSpotUVCost != null
    ? n(o.totalSpotUVCost)
    : safe(calcSpotUVCost(numberOfThousands, uvRate));

  const totalDieCuttingCost = o.totalDieCuttingCost != null
    ? n(o.totalDieCuttingCost)
    : safe(calcDieCuttingCost(numberOfThousands, punchCost, punchingCostPer1000));
  const pastingRate = n(PASTING_OPTIONS[s.pastingType]?.rate);
  const totalPastingCost = o.totalPastingCost != null
    ? n(o.totalPastingCost)
    : safe(calcPastingCost(s.orderQty, pastingRate));

  const breakdown = [
    { name: 'Paper', value: totalPaperCost },
    { name: 'Printing', value: totalPrintCost },
    { name: 'Lamination', value: totalLamCost },
    { name: 'Foiling', value: totalFoilingCost },
    { name: 'UV', value: totalSpotUVCost },
    { name: 'Die-Cutting', value: totalDieCuttingCost },
    { name: 'Pasting', value: totalPastingCost },
  ].filter(item => item.value !== 0);
  const totalProductionCost = safe(breakdown.reduce((total, item) => total + item.value, 0));

  const orderQty = n(s.orderQty);
  const margin = n(s.margin);  // decimal e.g. 0.20
  const gst = n(s.gst);        // decimal e.g. 0.18

  const costPerUnit = orderQty > 0 ? safe(totalProductionCost / orderQty) : 0;
  const sellingPricePerUnit = (1 - margin) > 0 ? safe(costPerUnit / (1 - margin)) : 0;
  const totalQuoteValue = safe(sellingPricePerUnit * orderQty);
  const gstAmount = safe(totalQuoteValue * gst);
  const grandTotal = safe(totalQuoteValue * (1 + gst));

  return {
    // Layout
    upsPerSheet, netSheets, grossSheets,
    // Paper
    weightPerSheet, totalPaperWeight, totalPaperCost,
    // Print & Lam
    machineLength, machineWidth, plateCost, printPrice, numberOfThousands,
    totalPrintCost, laminationCost, totalLamCost,
    // Finishes
    foilingBlockCost, foilingRunRate, totalFoilingCost, uvRate, totalSpotUVCost,
    // Finishing
    punchCost, punchingCostPer1000, totalDieCuttingCost, pastingRate, totalPastingCost,
    // Summary
    totalProductionCost, costPerUnit, sellingPricePerUnit, totalQuoteValue, gstAmount, grandTotal,
    // Backward-compat aliases so existing section components keep working
    paperCost: totalPaperCost,
    printCost: totalPrintCost,
    lamCost: totalLamCost,
    foilingCost: totalFoilingCost,
    uvCost: totalSpotUVCost,
    dieCuttingCost: totalDieCuttingCost,
    pastingCost: totalPastingCost,
    totalWeight: totalPaperWeight,
    totalUVCost: totalSpotUVCost,
    totalPunchingCost: totalDieCuttingCost,
    subtotal: totalQuoteValue,
    finalTotal: grandTotal,
    breakdown: breakdown.map(item => ({ ...item, pct: totalProductionCost > 0 ? safe(item.value / totalProductionCost * 100).toFixed(1) : '0.0' })),
  };
};
