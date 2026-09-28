import { describe, expect, it, vi } from 'vitest';
import { IssueNotFoundError } from '../../../src/domain/errors.js';
import type { IssueDetails, OpenedPullRequest } from '../../../src/domain/issue.js';
import { renderBody } from '../../../src/render/issue-body.js';
import { PullRequestNotifier, pullRequestNote } from '../../../src/services/pull-request-notifier.js';
import { GUILD_ID, makeConfig, makeRequest, makeSource, silentLogger } from '../../support/fixtures.js';

const STARTED = new Date('2026-09-26T00:00:00.000Z');
const SDKS = 'avalon-initiative/avalon-sdks';

function pull(overrides: Partial<OpenedPullRequest> = {}): OpenedPullRequest {
  return {
    repo: SDKS,
    number: 20,
    title: '[#12] - fix reconnect',
    url: 'https://github.com/avalon-initiative/avalon-sdks/pull/20',
    body: 'Closes #12',
    createdAt: new Date('2026-09-26T10:00:00.000Z'),
    ...overrides,
  };
}

function issue(overrides: Partial<IssueDetails> = {}): IssueDetails {
  return {
    repo: SDKS,
    number: 12,
    title: 'SDK reconnect loses guild state',
    url: 'https://github.com/avalon-initiative/avalon-sdks/issues/12',
    body: renderBody(
      makeRequest({
        source: makeSource({
          messageUrl: `https://discord.com/channels/${GUILD_ID}/444444444444444444/333333333333333333`,
        }),
      }),
    ),
    authoredByBot: true,
    labels: ['decision'],
    open: true,
    ...overrides,
  };
}

function setup(pulls: readonly OpenedPullRequest[], details: IssueDetails | Error = issue()) {
  const listOpenedPullsSince = vi
    .fn()
    .mockImplementation((repo: string) => Promise.resolve(repo === SDKS ? pulls : []));
  const getIssueDetails = vi
    .fn()
    .mockImplementation(() =>
      details instanceof Error ? Promise.reject(details) : Promise.resolve(details),
    );
  const postNote = vi.fn().mockResolvedValue(undefined);
  let now = new Date('2026-09-26T12:00:00.000Z');
  const notifier = new PullRequestNotifier(
    makeConfig({ notifications: { pollIntervalMinutes: 15, pullRequests: true, mutedChannelIds: [] } }),
    { listOpenedPullsSince, getIssueDetails },
    { postNote },
    silentLogger,
    STARTED,
    () => now,
  );
  return {
    notifier,
    listOpenedPullsSince,
    getIssueDetails,
    postNote,
    advance: (to: string) => {
      now = new Date(to);
    },
  };
}

describe('PullRequestNotifier', () => {
  it('posts a note on the message the issue was filed from', async () => {
    const { notifier, postNote, getIssueDetails } = setup([pull()]);
    await notifier.poll();
    expect(getIssueDetails).toHaveBeenCalledWith(SDKS, 12);
    expect(postNote).toHaveBeenCalledWith(
      { channelId: '444444444444444444', messageId: '333333333333333333' },
      '🔀 A pull request ([#20](<https://github.com/avalon-initiative/avalon-sdks/pull/20>)) was opened for ticket **SDK reconnect loses guild state** ([#12](<https://github.com/avalon-initiative/avalon-sdks/issues/12>)).',
    );
  });

  it('notes each issue once, even across polls and pull requests', async () => {
    const { notifier, postNote, getIssueDetails } = setup([pull(), pull({ number: 21 })]);
    await notifier.poll();
    await notifier.poll();
    expect(postNote).toHaveBeenCalledTimes(1);
    expect(getIssueDetails).toHaveBeenCalledTimes(1);
  });

  it('notes every issue a pull request closes', async () => {
    const { notifier, postNote } = setup([pull({ body: 'Closes #12\nFixes #13' })]);
    await notifier.poll();
    expect(postNote).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['not filed by the bot', issue({ authoredByBot: false })],
    ['without Discord links', issue({ body: 'plain issue' })],
    [
      'from another guild',
      issue({ body: '- Source message: https://discord.com/channels/999999999999999999/1/2' }),
    ],
  ])('ignores an issue %s', async (_name, details) => {
    const { notifier, postNote } = setup([pull()], details);
    await notifier.poll();
    expect(postNote).not.toHaveBeenCalled();
  });

  it('ignores pull requests that reference no issue', async () => {
    const { notifier, getIssueDetails } = setup([pull({ body: 'Refactor only' })]);
    await notifier.poll();
    expect(getIssueDetails).not.toHaveBeenCalled();
  });

  it('gives up quietly on an issue that cannot be found', async () => {
    const { notifier, postNote, getIssueDetails } = setup([pull()], new IssueNotFoundError(SDKS, 12));
    await notifier.poll();
    await notifier.poll();
    expect(postNote).not.toHaveBeenCalled();
    expect(getIssueDetails).toHaveBeenCalledTimes(1);
  });

  it('retries from the same cursor when posting fails', async () => {
    const { notifier, postNote, listOpenedPullsSince, advance } = setup([pull()]);
    postNote.mockRejectedValueOnce(new Error('missing access'));
    await notifier.poll();
    advance('2026-09-26T12:15:00.000Z');
    await notifier.poll();
    expect(postNote).toHaveBeenCalledTimes(2);
    const sinceValues = listOpenedPullsSince.mock.calls
      .filter((c: unknown[]) => c[0] === SDKS)
      .map((c: unknown[]) => c[1]);
    expect(sinceValues).toEqual([STARTED, STARTED]);
  });

  it('advances the cursor after a clean poll and survives a failing repository', async () => {
    const { notifier, listOpenedPullsSince, advance } = setup([]);
    listOpenedPullsSince.mockRejectedValueOnce(new Error('403'));
    await notifier.poll();
    advance('2026-09-26T12:15:00.000Z');
    await notifier.poll();
    const forSdks = listOpenedPullsSince.mock.calls.filter((c: unknown[]) => c[0] === SDKS);
    expect(forSdks[1]?.[1]).toEqual(STARTED);
    await notifier.poll();
    expect(listOpenedPullsSince.mock.calls.filter((c: unknown[]) => c[0] === SDKS)[2]?.[1]).toEqual(
      new Date('2026-09-26T12:15:00.000Z'),
    );
  });
});

describe('pullRequestNote', () => {
  it('links the pull request and the issue without embeds', () => {
    const note = pullRequestNote(pull(), issue());
    expect(note).toContain('(<https://github.com/avalon-initiative/avalon-sdks/pull/20>)');
    expect(note).toContain('(<https://github.com/avalon-initiative/avalon-sdks/issues/12>)');
  });
});
