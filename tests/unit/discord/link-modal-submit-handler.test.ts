import { describe, expect, it, vi } from 'vitest';
import {
  LinkModalSubmitHandler,
  type LinkSubmitRequest,
} from '../../../src/discord/handlers/link-modal-submit-handler.js';
import type { PendingFiling } from '../../../src/discord/pending.js';
import { RESPONSES } from '../../../src/discord/responses.js';
import { IssueNotFoundError, RepositoryNotAccessibleError } from '../../../src/domain/errors.js';
import type { CreatedIssue } from '../../../src/domain/issue.js';
import { LinkIssueService } from '../../../src/services/link-issue-service.js';
import { TtlStore } from '../../../src/util/ttl-store.js';
import { makeConfig, makeSource, silentLogger } from '../../support/fixtures.js';

const ISSUE: CreatedIssue = {
  repo: 'avalon-initiative/avalon-sdks',
  number: 12,
  title: 'Existing',
  url: 'https://github.com/avalon-initiative/avalon-sdks/issues/12',
  labelsApplied: true,
};

function setup(getIssue = vi.fn().mockResolvedValue(ISSUE)) {
  const pending = new TtlStore<PendingFiling>(60_000);
  pending.set('p1', { userId: 'u1', source: makeSource() });
  const service = new LinkIssueService(makeConfig(), {
    createIssue: vi.fn(),
    getIssue,
    addComment: vi.fn().mockResolvedValue(undefined),
  });
  const handler = new LinkModalSubmitHandler(service, pending, silentLogger);
  const calls = {
    deferEphemeral: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    replyToMessage: vi.fn().mockResolvedValue(undefined),
    markHandled: vi.fn().mockResolvedValue(undefined),
  };
  const request = (overrides: Partial<LinkSubmitRequest> = {}): LinkSubmitRequest => ({
    customId: 'link-issue:p1',
    userId: 'u1',
    userName: 'Bob',
    fields: { getTextInputValue: () => 'sdks#12' },
    ...calls,
    ...overrides,
  });
  return { handler, calls, request };
}

describe('LinkModalSubmitHandler', () => {
  it('replies to the message with the link, marks it and confirms privately', async () => {
    const { handler, calls, request } = setup();
    await handler.handle(request());
    expect(calls.markHandled).toHaveBeenCalledWith('333333333333333333');
    expect(calls.replyToMessage).toHaveBeenCalledWith(
      '333333333333333333',
      '🔗 Ticket **Existing** ([#12](<https://github.com/avalon-initiative/avalon-sdks/issues/12>)) linked',
    );
    expect(calls.editReply).toHaveBeenCalledWith(RESPONSES.linked);
  });

  it('still replies when the marker cannot be added', async () => {
    const { handler, calls, request } = setup();
    calls.markHandled.mockRejectedValue(new Error('missing permission'));
    await handler.handle(request());
    expect(calls.replyToMessage).toHaveBeenCalledOnce();
    expect(calls.editReply).toHaveBeenCalledWith(RESPONSES.linked);
  });

  it('tells the user when the reference is not understood', async () => {
    const { handler, calls, request } = setup();
    await handler.handle(request({ fields: { getTextInputValue: () => 'nonsense' } }));
    expect(calls.editReply).toHaveBeenCalledWith(RESPONSES.invalidReference);
    expect(calls.replyToMessage).not.toHaveBeenCalled();
    expect(calls.markHandled).not.toHaveBeenCalled();
  });

  it('reports an unknown or invisible issue', async () => {
    const { handler, calls, request } = setup(vi.fn().mockRejectedValue(new IssueNotFoundError('r/r', 12)));
    await handler.handle(request());
    expect(calls.editReply).toHaveBeenCalledWith(RESPONSES.issueNotFound);
    expect(calls.replyToMessage).not.toHaveBeenCalled();
  });

  it('reports a repository the app cannot access', async () => {
    const { handler, calls, request } = setup(
      vi.fn().mockRejectedValue(new RepositoryNotAccessibleError('r/r')),
    );
    await handler.handle(request());
    expect(calls.editReply).toHaveBeenCalledWith(RESPONSES.repoNotAccessible);
  });

  it('reports unexpected failures generically', async () => {
    const { handler, calls, request } = setup(vi.fn().mockRejectedValue(new Error('boom')));
    await handler.handle(request());
    expect(calls.editReply).toHaveBeenCalledWith(RESPONSES.unexpectedLink);
  });

  it('rejects an expired form or another user', async () => {
    const { handler, calls, request } = setup();
    await handler.handle(request({ userId: 'someone-else' }));
    expect(calls.editReply).toHaveBeenCalledWith(RESPONSES.expired);
    await handler.handle(request());
    expect(calls.editReply).toHaveBeenLastCalledWith(RESPONSES.expired);
  });
});
