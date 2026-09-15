import { readJSON, writeJSON, isRecordArray, isRecord } from './storage';

const KEY = 'datpack_recovery_drafts';
const validDrafts = value => isRecordArray(value) && value.every(draft =>
  typeof draft.client_id === 'string' && isRecord(draft.state) && Number.isInteger(draft.editRevision));
export const getDrafts = () => readJSON(KEY, [], validDrafts);
export const storeDraft = draft => {
  const drafts = getDrafts();
  writeJSON(KEY, [...drafts.filter(item => item.id !== draft.id), JSON.parse(JSON.stringify(draft))]);
};
export const removeDraft = (id, revision) => {
  const drafts = getDrafts();
  writeJSON(KEY, drafts.filter(item => item.id !== id || (revision != null && item.editRevision > revision)));
};