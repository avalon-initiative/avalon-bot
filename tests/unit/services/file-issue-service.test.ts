import { describe, expect, it, vi } from 'vitest';
import { InvalidTitleError, UnknownRepositoryError } from '../../../src/domain/errors.js';
import type { CreatedIssue, NewIssue } from '../../../src/domain/issue.js';
import { FileIssueService } from '../../../src/services/file-issue-service.js';
import { makeConfig, makeRequest } from '../../support/fixtures.js';

function setup() {
  const created: CreatedIssue = {
    repo: 'avalon-initiative/avalon-sdks',
    number: 7,
    title: 't',
    url: 'u',
    labelsApplied: true,
  };
  const createIssue = vi.fn<(issue: NewIssue) => Promise<CreatedIssue>>().mockResolvedValue(created);
  return { service: new FileIssueService(makeConfig(), { createIssue }), createIssue, created };
}

describe('FileIssueService', () => {
  it('files into the configured repository with the configured label', async () => {
    const { service, createIssue, created } = setup();
    await expect(service.file(makeRequest({ kind: 'feature' }))).resolves.toBe(created);
    const sent = createIssue.mock.calls[0]?.[0];
    expect(sent?.repo).toBe('avalon-initiative/avalon-sdks');
    expect(sent?.labels).toEqual(['type: feature']);
    expect(sent?.body).toContain('## Proposed Feature');
  });

  it('rejects unknown repository keys without calling the tracker', async () => {
    const { service, createIssue } = setup();
    await expect(service.file(makeRequest({ repoKey: 'nope' }))).rejects.toBeInstanceOf(
      UnknownRepositoryError,
    );
    expect(createIssue).not.toHaveBeenCalled();
  });

  it('rejects blank titles', async () => {
    const { service, createIssue } = setup();
    await expect(service.file(makeRequest({ title: '   ' }))).rejects.toBeInstanceOf(InvalidTitleError);
    expect(createIssue).not.toHaveBeenCalled();
  });
});
