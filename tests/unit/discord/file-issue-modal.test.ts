import { describe, expect, it } from 'vitest';
import {
  buildFileIssueModal,
  parseModalSubmission,
  pendingIdFrom,
} from '../../../src/discord/modal/file-issue-modal.js';
import { makeConfig } from '../../support/fixtures.js';

function fields(selects: Record<string, string[]>, texts: Record<string, string>) {
  return {
    getStringSelectValues: (id: string) => selects[id] ?? [],
    getTextInputValue: (id: string) => texts[id] ?? '',
  };
}

describe('buildFileIssueModal', () => {
  const modal = buildFileIssueModal({
    pendingId: 'abc',
    repositories: makeConfig().repositories,
    defaultRepoKey: 'hub',
  }).toJSON();

  it('carries the pending id in its custom id', () => {
    expect(pendingIdFrom(modal.custom_id)).toBe('abc');
  });

  it('stays within the five-component modal limit', () => {
    expect(modal.components.length).toBeLessThanOrEqual(5);
  });

  it('preselects the default repository', () => {
    const repoLabel = modal.components.find((c) => JSON.stringify(c).includes('"custom_id":"repo"'));
    const options = JSON.stringify(repoLabel);
    expect(options).toMatch(/"value":"hub"[^}]*"default":true/);
    expect(options).not.toMatch(/"value":"sdks"[^}]*"default":true/);
  });
});

describe('parseModalSubmission', () => {
  it('reads a complete submission', () => {
    expect(
      parseModalSubmission(fields({ kind: ['bug'], repo: ['sdks'] }, { title: 'T', notes: 'N' })),
    ).toEqual({ kind: 'bug', repoKey: 'sdks', title: 'T', notes: 'N' });
  });

  it('rejects a missing or unknown selection', () => {
    expect(parseModalSubmission(fields({ repo: ['sdks'] }, {}))).toBeUndefined();
    expect(parseModalSubmission(fields({ kind: ['epic'], repo: ['sdks'] }, {}))).toBeUndefined();
    expect(parseModalSubmission(fields({ kind: ['bug'] }, {}))).toBeUndefined();
  });
});

describe('pendingIdFrom', () => {
  it('ignores foreign modals', () => {
    expect(pendingIdFrom('other:1')).toBeUndefined();
  });
});
