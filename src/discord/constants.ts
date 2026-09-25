export const COMMAND_NAME = 'File GitHub Issue';
export const MODAL_ID_PREFIX = 'file-issue:';
export const HANDLED_EMOJI = '✅';

export const FIELD = {
  kind: 'kind',
  repo: 'repo',
  title: 'title',
  notes: 'notes',
} as const;

/** How long a submitted-to-modal message stays claimable; matches Discord's interaction token lifetime. */
export const PENDING_TTL_MS = 15 * 60 * 1000;
