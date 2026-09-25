import { describe, expect, it, vi } from 'vitest';
import { RepositoryNotAccessibleError } from '../../../src/domain/errors.js';
import type { GitHubAppClient } from '../../../src/github/app-client.js';
import { OctokitIssueTracker } from '../../../src/github/octokit-issue-tracker.js';

const ISSUE = { repo: 'avalon-initiative/avalon-sdks', title: 'T', body: 'B', labels: ['type: bug'] };
const RESPONSE = { data: { number: 12, html_url: 'https://github.com/x/y/issues/12', title: 'T' } };

function statusError(status: number): Error {
  return Object.assign(new Error(`http ${String(status)}`), { status });
}

function setup(request = vi.fn().mockResolvedValue(RESPONSE)) {
  const installationIdFor = vi.fn().mockResolvedValue(99);
  const github: GitHubAppClient = { installationIdFor, clientFor: () => Promise.resolve({ request }) };
  return { tracker: new OctokitIssueTracker(github), request, installationIdFor };
}

describe('OctokitIssueTracker', () => {
  it('creates the issue with labels', async () => {
    const { tracker, request } = setup();
    const created = await tracker.createIssue(ISSUE);
    expect(created).toEqual({
      repo: ISSUE.repo,
      number: 12,
      title: 'T',
      url: RESPONSE.data.html_url,
      labelsApplied: true,
    });
    expect(request).toHaveBeenCalledWith(
      'POST /repos/{owner}/{repo}/issues',
      expect.objectContaining({ owner: 'avalon-initiative', repo: 'avalon-sdks', labels: ['type: bug'] }),
    );
  });

  it('retries without labels when GitHub rejects them', async () => {
    const request = vi.fn().mockRejectedValueOnce(statusError(422)).mockResolvedValueOnce(RESPONSE);
    const { tracker } = setup(request);
    const created = await tracker.createIssue(ISSUE);
    expect(created.labelsApplied).toBe(false);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1]?.[1]).not.toHaveProperty('labels');
  });

  it('does not swallow other failures', async () => {
    const { tracker } = setup(vi.fn().mockRejectedValue(statusError(500)));
    await expect(tracker.createIssue(ISSUE)).rejects.toThrow('http 500');
  });

  it('maps a missing installation to RepositoryNotAccessibleError', async () => {
    const { tracker, installationIdFor } = setup();
    installationIdFor.mockRejectedValue(statusError(404));
    await expect(tracker.createIssue(ISSUE)).rejects.toBeInstanceOf(RepositoryNotAccessibleError);
  });

  it('looks up each repository installation once', async () => {
    const { tracker, installationIdFor } = setup();
    await tracker.createIssue(ISSUE);
    await tracker.createIssue(ISSUE);
    expect(installationIdFor).toHaveBeenCalledTimes(1);
  });
});
