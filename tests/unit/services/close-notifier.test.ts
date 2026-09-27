import { describe, expect, it, vi } from 'vitest';
import type { ClosedIssue } from '../../../src/domain/issue.js';
import { renderBody } from '../../../src/render/issue-body.js';
import { CloseNotifier, issueClosedNote } from '../../../src/services/close-notifier.js';
import { GUILD_ID, makeConfig, makeRequest, makeSource, silentLogger } from '../../support/fixtures.js';

const STARTED = new Date('2026-09-26T00:00:00.000Z');

function closedIssue(overrides: Partial<ClosedIssue> = {}): ClosedIssue {
  return {
    repo: 'avalon-initiative/avalon-sdks',
    number: 147,
    title: 'SDK reconnect loses guild state',
    url: 'https://github.com/avalon-initiative/avalon-sdks/issues/147',
    body: renderBody(
      makeRequest({
        source: makeSource({
          messageUrl: `https://discord.com/channels/${GUILD_ID}/444444444444444444/333333333333333333`,
        }),
      }),
    ),
    closedAt: new Date('2026-09-26T10:00:00.000Z'),
    stateReason: 'completed',
    authoredByBot: true,
    ...overrides,
  };
}

function setup(
  issues: readonly ClosedIssue[],
  notifications: { pollIntervalMinutes: number; mutedChannelIds: string[] } = {
    pollIntervalMinutes: 15,
    mutedChannelIds: [],
  },
) {
  const listClosedSince = vi.fn().mockResolvedValue(issues);
  const postNote = vi.fn().mockResolvedValue(undefined);
  let now = new Date('2026-09-26T12:00:00.000Z');
  const notifier = new CloseNotifier(
    makeConfig({ notifications }),
    { listClosedSince },
    { postNote },
    silentLogger,
    STARTED,
    () => now,
  );
  return {
    notifier,
    listClosedSince,
    postNote,
    advance: (to: string) => {
      now = new Date(to);
    },
  };
}

describe('CloseNotifier', () => {
  it('posts a note to the original message channel', async () => {
    const { notifier, postNote } = setup([closedIssue()]);
    await notifier.poll();
    expect(postNote).toHaveBeenCalledWith(
      { guildId: GUILD_ID, channelId: '444444444444444444', messageId: '333333333333333333' },
      '🔒 Ticket **SDK reconnect loses guild state** ([#147](<https://github.com/avalon-initiative/avalon-sdks/issues/147>)) was closed.',
    );
  });

  it('starts from the process start time, then from the previous poll', async () => {
    const { notifier, listClosedSince, advance } = setup([]);
    await notifier.poll();
    expect(listClosedSince.mock.calls[0]?.[1]).toEqual(STARTED);
    advance('2026-09-26T12:15:00.000Z');
    await notifier.poll();
    expect(listClosedSince.mock.calls.at(-1)?.[1]).toEqual(new Date('2026-09-26T12:00:00.000Z'));
  });

  it('queries every configured repository', async () => {
    const { notifier, listClosedSince } = setup([]);
    await notifier.poll();
    expect(listClosedSince.mock.calls.map((c: unknown[]) => c[0])).toEqual([
      'avalon-initiative/avalon-sdks',
      'avalon-initiative/avalon-hub',
    ]);
  });

  it('does not repeat a closure, but notifies again after a reopen and re-close', async () => {
    const { notifier, postNote, listClosedSince } = setup([closedIssue()]);
    await notifier.poll();
    await notifier.poll();
    expect(postNote).toHaveBeenCalledTimes(1);
    listClosedSince.mockResolvedValue([closedIssue({ closedAt: new Date('2026-09-26T13:00:00.000Z') })]);
    await notifier.poll();
    expect(postNote).toHaveBeenCalledTimes(2);
  });

  it('ignores issues the bot did not open', async () => {
    const { notifier, postNote } = setup([closedIssue({ authoredByBot: false })]);
    await notifier.poll();
    expect(postNote).not.toHaveBeenCalled();
  });

  it('ignores issues without Discord links, or from another guild', async () => {
    const { notifier, postNote } = setup([
      closedIssue({ body: 'plain issue' }),
      closedIssue({
        number: 2,
        body: '- Source message: https://discord.com/channels/999999999999999999/1/2',
      }),
    ]);
    await notifier.poll();
    expect(postNote).not.toHaveBeenCalled();
  });

  it('skips muted channels', async () => {
    const { notifier, postNote } = setup([closedIssue()], {
      pollIntervalMinutes: 15,
      mutedChannelIds: ['444444444444444444'],
    });
    await notifier.poll();
    expect(postNote).not.toHaveBeenCalled();
  });

  it('keeps the cursor and retries when posting fails', async () => {
    const { notifier, postNote, listClosedSince, advance } = setup([closedIssue()]);
    postNote.mockRejectedValueOnce(new Error('missing access'));
    await notifier.poll();
    advance('2026-09-26T12:15:00.000Z');
    await notifier.poll();
    expect(postNote).toHaveBeenCalledTimes(2);
    const sinceValues = listClosedSince.mock.calls.map((c: unknown[]) => c[1]);
    expect(sinceValues.slice(0, 3)).toEqual([STARTED, STARTED, STARTED]);
  });

  it('continues with other repositories when one query fails and retries it next poll', async () => {
    const { notifier, listClosedSince, postNote } = setup([closedIssue()]);
    listClosedSince.mockRejectedValueOnce(new Error('503')).mockResolvedValue([closedIssue()]);
    await notifier.poll();
    expect(listClosedSince).toHaveBeenCalledTimes(2);
    expect(postNote).toHaveBeenCalledTimes(1);
    await notifier.poll();
    expect(listClosedSince.mock.calls[2]?.[1]).toEqual(STARTED);
  });
});

describe('issueClosedNote', () => {
  it('says when an issue was closed as not planned', () => {
    expect(issueClosedNote(closedIssue({ stateReason: 'not_planned' }))).toContain(
      'was closed as not planned.',
    );
  });
});
