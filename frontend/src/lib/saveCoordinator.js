export class QuoteConflictError extends Error {
  constructor(message = 'This quotation changed elsewhere. Reload it before saving, or create a copy of your draft.') {
    super(message);
    this.name = 'QuoteConflictError';
  }
}

export function createSaveCoordinator(adapter, { onPending = () => {}, onAcknowledged = () => {} } = {}) {
  const queues = new Map();
  const requests = new Map();
  const revisions = new Map();
  const latestSubmitted = new Map();
  const retired = new Set();
  const deletes = new Map();
  const unconfirmed = new Map();

  const save = snapshot => {
    const captured = JSON.parse(JSON.stringify(snapshot));
    const sessionKey = `${captured.id}:${captured.sessionId}`;
    const requestKey = `${sessionKey}:${captured.editRevision}`;
    if (retired.has(captured.id)) return Promise.reject(new QuoteConflictError('This quotation has been deleted. Start a new quotation.'));
    if (requests.has(requestKey)) return requests.get(requestKey);
    if (captured.editRevision < (latestSubmitted.get(sessionKey) ?? -1)) {
      return Promise.reject(new QuoteConflictError('A newer draft revision is already being saved. The older snapshot was not written.'));
    }
    latestSubmitted.set(sessionKey, captured.editRevision);
    const recoveredPending = revisions.has(sessionKey) ? null : captured.pendingWrite;
    if (!revisions.has(sessionKey)) revisions.set(sessionKey, captured.expectedRevision);
    const previous = queues.get(captured.id) || Promise.resolve();
    const operation = previous.catch(() => {}).then(async () => {
      if (retired.has(captured.id)) throw new QuoteConflictError('This quotation is being deleted.');
      const pending = unconfirmed.get(sessionKey) || recoveredPending;
      if (pending) {
        if (pending.payload.id !== captured.id || pending.payload.client_id !== captured.client_id) throw new QuoteConflictError('Recovery identity mismatch. The draft was not replayed.');
        const confirmed = await adapter.saveQuotation(pending.payload);
        revisions.set(sessionKey, confirmed.revision);
        unconfirmed.delete(sessionKey);
        onAcknowledged(captured, confirmed);
        if (JSON.stringify(pending.payload.state) === JSON.stringify(captured.state) && pending.payload.job_name === captured.job_name) return confirmed;
      }
      const { sessionId, editRevision, expectedRevision, pendingWrite, ...payload } = captured;
      const pendingRequest = { payload: { ...payload, expected_revision: revisions.get(sessionKey) }, editRevision };
      unconfirmed.set(sessionKey, pendingRequest);
      onPending(captured, pendingRequest);
      const saved = await adapter.saveQuotation(pendingRequest.payload);
      revisions.set(sessionKey, saved.revision);
      unconfirmed.delete(sessionKey);
      onAcknowledged(captured, saved);
      return saved;
    });
    queues.set(captured.id, operation);
    requests.set(requestKey, operation);
    operation.then(() => {
      for (const key of requests.keys()) {
        if (key.startsWith(`${sessionKey}:`) && Number(key.slice(sessionKey.length + 1)) < captured.editRevision) requests.delete(key);
      }
    }, () => { requests.delete(requestKey); });
    return operation;
  };

  const remove = id => {
    if (deletes.has(id)) return deletes.get(id);
    retired.add(id);
    const operation = (queues.get(id) || Promise.resolve()).catch(() => {}).then(() => adapter.deleteQuotation(id));
    deletes.set(id, operation);
    operation.catch(() => { deletes.delete(id); });
    return operation;
  };

  return { save, remove, isRetired: id => retired.has(id) };
}