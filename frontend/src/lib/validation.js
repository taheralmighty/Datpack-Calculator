import { MACHINE_SIZES, LAMINATION_OPTIONS, FOILING_SIZES, UV_OPTIONS, PASTING_OPTIONS, MODEL_VERSION, selectMachineSize } from './calc';

const counts = new Set(['orderQty', 'upsPerSheet', 'netSheets', 'grossSheets']);
const selections = { machineSize: MACHINE_SIZES, laminationType: LAMINATION_OPTIONS, foilingSize: FOILING_SIZES, uvType: UV_OPTIONS, pastingType: PASTING_OPTIONS };
const numericFields = ['orderQty', 'upsPerSheet', 'masterLength', 'masterWidth', 'gsm', 'paperRate', 'platenWastage', 'margin', 'gst'];
export const validNumber = value => (typeof value === 'number' || typeof value === 'string') &&
  String(value).trim() !== '' && Number.isFinite(Number(value));

export function overrideError(key, value) {
  if (!validNumber(value) || Number(value) < 0) return `${key}: enter a finite, nonnegative number.`;
  if (counts.has(key) && !Number.isInteger(Number(value))) return `${key}: enter a whole number.`;
  return null;
}

export function validateQuote(state) {
  const errors = {}, missing = {};
  if (state.issueSnapshot && (!state.issueSnapshot.state || !state.issueSnapshot.calc || !Array.isArray(state.issueSnapshot.calc.breakdown))) {
    errors.issueSnapshot = 'The issued snapshot is invalid. Restore the original record before exporting.';
  }
  for (const key of numericFields) {
    const value = state[key];
    if (value == null || value === '') continue;
    const error = overrideError(key, value);
    if (error) errors[key] = error;
  }
  for (const key of ['gst', 'platenWastage']) {
    if (validNumber(state[key]) && Number(state[key]) > 1) errors[key] = `${key}: enter a percentage between 0 and 100.`;
  }
  for (const [key, options] of Object.entries(selections)) {
    if (state[key] != null && state[key] !== '' && !Object.prototype.hasOwnProperty.call(options, state[key])) errors[key] = `${key}: choose an available option.`;
  }
  for (const [key, value] of Object.entries(state.overrides || {})) {
    const error = overrideError(key, value);
    if (error) errors[`overrides.${key}`] = error;
  }
  if (state.pricingModelVersion > MODEL_VERSION) errors.version = 'This quotation uses a newer, unsupported pricing model.';
  for (const key of ['orderQty', 'upsPerSheet', 'masterLength', 'masterWidth', 'gsm']) {
    if (!errors[key] && !(Number(state[key]) > 0)) missing[key] = `${key}: enter a value greater than zero.`;
  }
  if (!errors.masterLength && !errors.masterWidth && !missing.masterLength && !missing.masterWidth &&
    !selectMachineSize(state.masterLength, state.masterWidth)) {
    const sizes = Object.values(MACHINE_SIZES);
    const largest = sizes[sizes.length - 1];
    missing.machineSize = `Master sheet exceeds the largest machine size (${largest.length} × ${largest.width} in); no machine can be selected.`;
  }
  if (!String(state.jobName || '').trim()) missing.jobName = 'Enter a job name.';
  if (state.migrationReview?.required) missing.migration = 'Review and acknowledge the legacy quotation before issuing a revision.';
  const status = Object.keys(errors).length ? 'invalid' : Object.keys(missing).length ? 'incomplete' : 'exportable';
  return { status, errors, missing, messages: [...Object.values(errors), ...Object.values(missing)] };
}

export function assertExportable(state) {
  const result = validateQuote(state);
  if (result.status !== 'exportable') throw new Error(result.messages.join(' '));
}