import { validateQuote, assertExportable } from './validation';
import { getDefaultState, migrateState } from './calc';
const valid = () => ({ ...getDefaultState(), jobName: 'Test', orderQty: 1000, upsPerSheet: 4, masterLength: 20, masterWidth: 28, gsm: 300 });
test.each([-1, 0.5, '12bad', NaN, Infinity])('invalid count %s is not exportable', orderQty => {
  expect(validateQuote({ ...valid(), orderQty }).status).toBe('invalid');
  expect(() => assertExportable({ ...valid(), orderQty })).toThrow();
});
test('draft missing values and optional empty selections are distinct', () => {
  expect(validateQuote(getDefaultState()).status).toBe('incomplete');
  expect(validateQuote({ ...valid(), margin: 0, gst: 0, paperRate: 0 }).status).toBe('exportable');
  expect(validateQuote({ ...valid(), margin: 1 }).status).toBe('invalid');
  expect(validateQuote({ ...valid(), machineSize: 'unknown' }).status).toBe('invalid');
  expect(validateQuote({ ...valid(), overrides: { totalPaperCost: -1 } }).status).toBe('invalid');
});
test.each([0, 0.5, 1, 5, 18, 100])('known legacy percent format converts %s without magnitude guessing', value => {
  const migrated = migrateState({ wastage: value, margin: value, gst: value });
  expect(migrated.platenWastage).toBe(value / 100);
  expect(migrated.margin).toBe(value / 100);
  expect(migrated.gst).toBe(value / 100);
  expect(migrateState(migrated)).toEqual(migrated);
});
test('ambiguous and future records cannot silently issue', () => {
  const migrated = migrateState({ jobName: 'Legacy', margin: 1 });
  expect(migrated.migrationReview.percentageFormat).toBe('ambiguous');
  expect(migrated.margin).toBe(1);
  expect(() => assertExportable(migrated)).toThrow();
  expect(() => migrateState({ pricingModelVersion: 99 })).toThrow(/Unsupported/);
});

test('a historically ignored totalWeight override in decimal-format state is not silently activated', () => {
  const original = { ...valid(), pricingModelVersion: undefined, platenWastage: 0.05, margin: 0.2, overrides: { totalWeight: 12 } };
  const migrated = migrateState(original);
  expect(migrated.margin).toBe(0.2);
  expect(migrated.overrides.totalPaperWeight).toBeUndefined();
  expect(migrated.migrationReview.pendingWeightOverride).toBe(12);
  expect(migrated.legacyState.overrides.totalWeight).toBe(12);
});