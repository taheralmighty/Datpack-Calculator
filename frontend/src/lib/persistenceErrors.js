export const isTemporaryConnectionError = (error, status) => !!error && (
  error.retryable === true || status === 0 || status === 408 || status === 429 || status >= 500 ||
  /failed to fetch|fetch failed|networkerror|network request failed|offline|aborterror/i.test(error.message || '')
);

export function persistenceError(error, status) {
  if (!isTemporaryConnectionError(error, status)) return error;
  const result = new Error(error.message || 'Supabase connection unavailable.');
  result.name = 'ConnectionUnavailableError';
  result.retryable = true;
  result.cause = error;
  return result;
}