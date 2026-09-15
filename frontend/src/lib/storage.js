export class StorageError extends Error {
  constructor(message, key, cause) {
    super(message);
    this.name = 'StorageError';
    this.key = key;
    this.cause = cause;
  }
}

export function readJSON(key, fallback, validate = () => true) {
  let raw;
  try { raw = localStorage.getItem(key); }
  catch (cause) { throw new StorageError('Browser storage is unavailable. Enable storage or export your work before closing.', key, cause); }
  if (raw === null) return fallback;
  let value;
  try { value = JSON.parse(raw); }
  catch (cause) { throw new StorageError(`Stored data (${key}) is damaged. Its original contents have been preserved; restore a backup before saving.`, key, cause); }
  if (!validate(value)) throw new StorageError(`Stored data (${key}) has an unsupported format. No data was replaced.`, key);
  return value;
}

export function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (cause) { throw new StorageError('Could not store your work. Check browser storage permissions and available space, then retry.', key, cause); }
}

export const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const isRecordArray = value => Array.isArray(value) && value.every(item => isRecord(item) && typeof item.id === 'string' && item.id.length > 0);