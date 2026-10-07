import { calcAll, calcNumberOfThousands, calcUpsPerSheet, getDefaultState, migrateState, selectMachineSize } from './calc';

const quote = (fields = {}) => ({
  ...getDefaultState(), orderQty: 5000, upsPerSheet: 4,
  masterLength: 20, masterWidth: 28, gsm: 300, paperRate: 120, ...fields,
});

test('sheet rounding, direct ups and decimal wastage preserve the calculation chain', () => {
  expect(calcUpsPerSheet(28, 20, 8, 6)).toBe(9);
  const calc = calcAll(quote({ orderQty: 5001 }));
  expect(calc.upsPerSheet).toBe(4);
  expect(calc.netSheets).toBe(1251);
  expect(calc.grossSheets).toBe(1314);
  expect(calc.weightPerSheet).toBeCloseTo(20 * 28 * 300 / 1550000, 10);
  expect(calc.totalPaperCost).toBeCloseTo(calc.grossSheets * calc.weightPerSheet * 120, 10);
});

test.each([[0, 0], [500, 1], [1200, 1], [1201, 2], [2200, 2], [2201, 3], [3200, 3], [3201, 4]])(
  '%s gross sheets uses tier %s', (sheets, tier) => expect(calcNumberOfThousands(sheets)).toBe(tier),
);

test.each([
  ['size1', 18, 25, 1200, 1500, 1500, 400],
  ['size2', 20, 28, 1500, 1800, 2000, 450],
  ['size3', 25, 36, 2400, 3200, 2500, 600],
  ['size4', 28, 40, 3000, 3500, 3000, 700],
])('machine %s controls both printing and punching', (machineSize, length, width, plate, print, punch, punching) => {
  const calc = calcAll(quote({ machineSize }));
  expect([calc.machineLength, calc.machineWidth, calc.plateCost, calc.printPrice, calc.punchCost, calc.punchingCostPer1000])
    .toEqual([length, width, plate, print, punch, punching]);
  expect(calc.totalPrintCost).toBe(plate + 2 * print);
  expect(calc.totalPunchingCost).toBe(punch + 2 * punching);
});

test.each([
  [18, 25, 'size1'], [17, 24, 'size1'], [19, 24, 'size2'], [18.5, 25, 'size2'], [20, 28, 'size2'],
  [21, 30, 'size3'], [25, 36, 'size3'], [26, 37, 'size4'], [28, 40, 'size4'], ['20', '28', 'size2'],
  [25, 18, 'size3'], [29, 40, ''], [28, 41, ''], [29, 41, ''],
  [undefined, 28, ''], [20, undefined, ''], ['', 28, ''], [20, null, ''], [0, 28, ''], [20, 0, ''],
  [-5, 28, ''], [NaN, 28, ''], [Infinity, 40, ''], ['abc', 28, ''],
])('master sheet %p × %p selects machine %p', (length, width, expected) => {
  expect(selectMachineSize(length, width)).toBe(expected);
});

test.each([
  ['regular_glass', 0.4], ['regular_matte', 0.5], ['regular_velvet', 1.25],
  ['thermal_glass', 0.7], ['thermal_matte', 0.8], ['thermal_velvet', 2.25],
])('lamination %s uses master dimensions', (laminationType, rate) => {
  const calc = calcAll(quote({ laminationType, flatLength: 1, flatWidth: 1, lamRate: 999 }));
  expect(calc.laminationCost).toBe(rate);
  expect(calc.totalLamCost).toBeCloseTo(1313 * 20 * 28 * rate / 100, 8);
});

test.each([['small', 1000, 1500], ['medium', 1750, 2500], ['large', 2500, 3500], ['xl', 4000, 5000]])(
  'foiling %s', (foilingSize, block, rate) => {
    const calc = calcAll(quote({ foilingSize }));
    expect(calc.foilingBlockCost).toBe(block);
    expect(calc.foilingRunRate).toBe(rate);
    expect(calc.totalFoilingCost).toBe(block + 2 * rate);
  },
);

test.each([['spot_uv', 2000], ['emboss_uv', 4000]])('UV %s', (uvType, rate) => {
  const calc = calcAll(quote({ uvType }));
  expect(calc.uvRate).toBe(rate);
  expect(calc.totalUVCost).toBe(2 * rate);
});

test.each([
  ['side_pasting', 0.25], ['auto_locking', 0.5], ['envelope', 2.5], ['paper_bag_small', 3],
  ['paper_bag_medium', 4], ['paper_bag_large', 5], ['ribbon_paper_bag', 12],
])('pasting %s uses quantity, not gross sheets', (pastingType, rate) => {
  const calc = calcAll(quote({ pastingType, platenWastage: 0.5 }));
  expect(calc.pastingRate).toBe(rate);
  expect(calc.totalPastingCost).toBe(5000 * rate);
});

test('all seven costs reconcile with markup pricing and GST', () => {
  const calc = calcAll(quote({ machineSize: 'size3', laminationType: 'thermal_matte', foilingSize: 'large', uvType: 'emboss_uv', pastingType: 'envelope' }));
  const expected = 1313 * 20 * 28 * 300 / 1550000 * 120 + 8800 + 5882.24 + 9500 + 8000 + 3700 + 12500;
  expect(calc.breakdown).toHaveLength(7);
  expect(calc.totalProductionCost).toBeCloseTo(expected, 8);
  expect(calc.breakdown.reduce((total, item) => total + item.value, 0)).toBe(calc.totalProductionCost);
  expect(calc.costPerUnit).toBeCloseTo(expected / 5000, 8);
  expect(calc.sellingPricePerUnit).toBeCloseTo(expected / 5000 * 1.2, 8);
  expect(calc.totalQuoteValue).toBeCloseTo(expected * 1.2, 8);
  expect(calc.gstAmount).toBeCloseTo(expected * 1.2 * 0.18, 8);
  expect(calc.grandTotal).toBeCloseTo(expected * 1.2 * 1.18, 8);
});

// Production cost ₹10,000 over 100 units = ₹100 cost per unit.
const costOf100 = fields => quote({ orderQty: 100, overrides: { totalPaperCost: 10000 }, ...fields });
test.each([[0, 100], [0.2, 120], [0.8, 180], [1, 200], [2, 300], [4, 500], [10, 1100], [20, 2100]])(
  'margin %p is a markup: ₹100 cost sells at ₹%p with no cap', (margin, price) => {
    const calc = calcAll(costOf100({ margin }));
    expect(calc.costPerUnit).toBe(100);
    expect(calc.sellingPricePerUnit).toBeCloseTo(price, 10);
    expect(calc.totalQuoteValue).toBeCloseTo(price * 100, 8);
    expect(calc.gstAmount).toBeCloseTo(price * 100 * 0.18, 8);
    expect(calc.grandTotal).toBeCloseTo(price * 100 * 1.18, 8);
  },
);

test('gross overrides feed the one shared tier; total overrides remain authoritative', () => {
  const calc = calcAll(quote({ machineSize: 'size1', foilingSize: 'small', uvType: 'spot_uv', overrides: { grossSheets: 2201, totalPaperCost: 123 } }));
  expect(calc.numberOfThousands).toBe(3);
  expect(calc.totalPrintCost).toBe(5700);
  expect(calc.totalFoilingCost).toBe(5500);
  expect(calc.totalUVCost).toBe(6000);
  expect(calc.totalPunchingCost).toBe(2700);
  expect(calc.totalPaperCost).toBe(123);
});

test('migration preserves legacy source without allowing old rates or repeat pricing to drive new quotes', () => {
  const saved = { flatLength: 8, flatWidth: 6, masterLength: 28, masterWidth: 20, orderQty: 1000, wastage: 5, margin: 20, gst: 18, clickCharge: 999, isRepeatOrder: true, overrides: { upsPerSheet: 4, foilBlockCost: 999 } };
  const migrated = migrateState(saved);
  expect(migrated.legacyState).toEqual(saved);
  expect(migrated.upsPerSheet).toBe(4);
  expect(migrated.platenWastage).toBe(0.05);
  expect(migrated.margin).toBe(0.2);
  expect(migrated.gst).toBe(0.18);
  expect(migrated.overrides).toEqual({});
  expect(calcAll(migrated).totalProductionCost).toBe(0);
  expect(calcAll(migrated).repeatGrandTotal).toBeUndefined();
  expect(migrateState(migrated)).toEqual(migrated);
  expect(saved.overrides.upsPerSheet).toBe(4);
  expect(migrateState({ ...saved, overrides: {} }).upsPerSheet).toBe(9);
  expect(migrateState({ wastage: 0, margin: 0, gst: 0 }).platenWastage).toBe(0);
});

test.each([undefined, null, '', 'invalid', Infinity, NaN])('incomplete/invalid inputs (%s) produce finite values', invalid => {
  const calc = calcAll(quote({ orderQty: invalid, upsPerSheet: invalid, masterLength: invalid, machineSize: invalid, laminationType: invalid, foilingSize: invalid, uvType: invalid, pastingType: invalid }));
  Object.values(calc).filter(value => typeof value === 'number').forEach(value => expect(Number.isFinite(value)).toBe(true));
  expect(calc.netSheets).toBe(0);
  expect(calc.grossSheets).toBe(0);
  expect(calc.totalProductionCost).toBe(0);
});

test('zero cost, zero quantity, huge markup, zero tax, and fresh overrides are safe', () => {
  expect(calcAll(costOf100({ overrides: { totalPaperCost: 0 }, margin: 0.5 })).sellingPricePerUnit).toBe(0);
  const noQty = calcAll(costOf100({ orderQty: 0, margin: 0.5 }));
  expect([noQty.costPerUnit, noQty.sellingPricePerUnit, noQty.totalQuoteValue, noQty.grandTotal]).toEqual([0, 0, 0, 0]);
  expect(Number.isFinite(calcAll(costOf100({ margin: 1e6 })).grandTotal)).toBe(true);
  const calc = calcAll(quote({ margin: 0, gst: 0 }));
  expect(calc.grandTotal).toBe(calc.totalProductionCost);
  const defaults = getDefaultState();
  defaults.overrides.grossSheets = 12;
  expect(getDefaultState().overrides).toEqual({});
});