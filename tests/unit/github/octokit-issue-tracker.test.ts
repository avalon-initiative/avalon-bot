import { describe, expect, it, vi } from 'vitest';
import { IssueNotFoundError, RepositoryNotAccessibleError } from '../../../src/domain/errors.js';
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

  it('fetches an issue', async () => {
    const { tracker, request } = setup();
    const issue = await tracker.getIssue(ISSUE.repo, 12);
    expect(issue).toMatchObject({ repo: ISSUE.repo, number: 12, url: RESPONSE.data.html_url });
    expect(request).toHaveBeenCalledWith('GET /repos/{owner}/{repo}/issues/{issue_number}', {
      owner: 'avalon-initiative',
      repo: 'avalon-sdks',
      issue_number: 12,
    });
  });

  it('maps a 404 on the issue to IssueNotFoundError', async () => {
    const { tracker } = setup(vi.fn().mockRejectedValue(statusError(404)));
    await expect(tracker.getIssue(ISSUE.repo, 12)).rejects.toBeInstanceOf(IssueNotFoundError);
  });

  it('does not map other issue lookup failures', async () => {
    const { tracker } = setup(vi.fn().mockRejectedValue(statusError(500)));
    await expect(tracker.getIssue(ISSUE.repo, 12)).rejects.toMatchObject({ status: 500 });
  });

  it('posts a comment', async () => {
    const { tracker, request } = setup();
    await tracker.addComment(ISSUE.repo, 12, 'hello');
    expect(request).toHaveBeenCalledWith('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner: 'avalon-initiative',
      repo: 'avalon-sdks',
      issue_number: 12,
      body: 'hello',
    });
  });

  describe('listClosedSince', () => {
    const since = new Date('2026-09-26T00:00:00.000Z');
    const item = (overrides: Record<string, unknown> = {}) => ({
      number: 1,
      title: 'T',
      html_url: 'https://github.com/x/y/issues/1',
      body: 'B',
      closed_at: '2026-09-26T10:00:00Z',
      state_reason: 'completed',
      user: { type: 'Bot' },
      ...overrides,
    });

    it('returns closed issues, skipping pull requests and closures before the cursor', async () => {
      const { tracker, request } = setup(
        vi.fn().mockResolvedValue({
          data: [
            item(),
            item({ number: 2, pull_request: {} }),
            item({ number: 3, closed_at: '2026-09-25T10:00:00Z' }),
            item({ number: 4, user: { type: 'User' }, state_reason: 'not_planned', body: null }),
          ],
        }),
      );
      const issues = await tracker.listClosedSince(ISSUE.repo, since);
      expect(issues.map((i) => i.number)).toEqual([1, 4]);
      expect(issues[0]).toMatchObject({ authoredByBot: true, stateReason: 'completed', body: 'B' });
      expect(issues[1]).toMatchObject({ authoredByBot: false, stateReason: 'not_planned', body: '' });
      expect(request).toHaveBeenCalledWith(
        'GET /repos/{owner}/{repo}/issues',
        expect.objectContaining({ state: 'closed', since: since.toISOString(), page: 1 }),
      );
    });

    it('pages until a short page', async () => {
      const full = Array.from({ length: 100 }, (_, n) => item({ number: n + 1 }));
      const request = vi
        .fn()
        .mockResolvedValueOnce({ data: full })
        .mockResolvedValueOnce({ data: [item({ number: 101 })] });
      const { tracker } = setup(request);
      const issues = await tracker.listClosedSince(ISSUE.repo, since);
      expect(issues).toHaveLength(101);
      expect(request).toHaveBeenCalledTimes(2);
    });
  });

  describe('pull requests and issue details', () => {
    const since = new Date('2026-09-26T00:00:00.000Z');
    const pullItem = (n: number, createdAt: string, body: string | null = 'Closes #1') => ({
      number: n,
      title: `PR ${String(n)}`,
      html_url: `https://github.com/x/y/pull/${String(n)}`,
      body,
      created_at: createdAt,
    });

    it('lists pull requests created since the cursor and stops at the first older one', async () => {
      const { tracker, request } = setup(
        vi.fn().mockResolvedValue({
          data: [
            pullItem(3, '2026-09-26T11:00:00Z'),
            pullItem(2, '2026-09-26T09:00:00Z', null),
            pullItem(1, '2026-09-25T09:00:00Z'),
          ],
        }),
      );
      const pulls = await tracker.listOpenedPullsSince(ISSUE.repo, since);
      expect(pulls.map((p) => p.number)).toEqual([3, 2]);
      expect(pulls[1]?.body).toBe('');
      expect(request).toHaveBeenCalledTimes(1);
      expect(request).toHaveBeenCalledWith(
        'GET /repos/{owner}/{repo}/pulls',
        expect.objectContaining({ state: 'all', sort: 'created', direction: 'desc', page: 1 }),
      );
    });

    it('pages through a full page of recent pull requests', async () => {
      const full = Array.from({ length: 100 }, (_, n) => pullItem(200 - n, '2026-09-26T11:00:00Z'));
      const request = vi
        .fn()
        .mockResolvedValueOnce({ data: full })
        .mockResolvedValueOnce({ data: [pullItem(50, '2026-09-25T11:00:00Z')] });
      const { tracker } = setup(request);
      expect(await tracker.listOpenedPullsSince(ISSUE.repo, since)).toHaveLength(100);
      expect(request).toHaveBeenCalledTimes(2);
    });

    it('fetches issue details including the body and author type', async () => {
      const { tracker } = setup(
        vi.fn().mockResolvedValue({
          data: { number: 12, title: 'T', html_url: 'u', body: 'B', user: { type: 'Bot' } },
        }),
      );
      expect(await tracker.getIssueDetails(ISSUE.repo, 12)).toEqual({
        repo: ISSUE.repo,
        number: 12,
        title: 'T',
        url: 'u',
        body: 'B',
        authoredByBot: true,
      });
    });

    it('maps a missing issue to IssueNotFoundError', async () => {
      const { tracker } = setup(vi.fn().mockRejectedValue(statusError(404)));
      await expect(tracker.getIssueDetails(ISSUE.repo, 12)).rejects.toBeInstanceOf(IssueNotFoundError);
    });
  });
});
