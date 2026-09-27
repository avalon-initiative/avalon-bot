import { describe, expect, it, vi } from 'vitest';
import { RepositoryNotAccessibleError } from '../../../src/domain/errors.js';
import type { CreatedIssue } from '../../../src/domain/issue.js';
import {
  ModalSubmitHandler,
  type ModalSubmitRequest,
} from '../../../src/discord/handlers/modal-submit-handler.js';
import type { PendingFiling } from '../../../src/discord/pending.js';
import { RESPONSES } from '../../../src/discord/responses.js';
import { FileIssueService } from '../../../src/services/file-issue-service.js';
import { TtlStore } from '../../../src/util/ttl-store.js';
import { makeConfig, makeSource, silentLogger } from '../../support/fixtures.js';

const CREATED: CreatedIssue = {
  repo: 'avalon-initiative/avalon-sdks',
  number: 147,
  title: 'SDK reconnect loses guild state',
  url: 'https://github.com/avalon-initiative/avalon-sdks/issues/147',
  labelsApplied: true,
};

function setup(createIssue = vi.fn().mockResolvedValue(CREATED), offerPromotion = false) {
  const pending = new TtlStore<PendingFiling>(60_000);
  pending.set('p1', { userId: 'u1', source: makeSource() });
  const handler = new ModalSubmitHandler(
    new FileIssueService(makeConfig(), { createIssue }),
    pending,
    silentLogger,
    offerPromotion,
  );
  const calls = {
    deferEphemeral: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    replyToMessage: vi.fn().mockResolvedValue(undefined),
    markHandled: vi.fn().mockResolvedValue(undefined),
  };
  const request = (overrides: Partial<ModalSubmitRequest> = {}): ModalSubmitRequest => ({
    customId: 'file-issue:p1',
    userId: 'u1',
    userName: 'Bob',
    fields: {
      getStringSelectValues: (id) => (id === 'kind' ? ['bug'] : ['sdks']),
      getTextInputValue: (id) => (id === 'title' ? 'SDK reconnect loses guild state' : ''),
    },
    ...calls,
    ...overrides,
  });
  return { handler, calls, request, createIssue };
}

describe('ModalSubmitHandler', () => {
  it('files the issue, marks the message, replies to it and confirms privately', async () => {
    const { handler, calls, request, createIssue } = setup();
    await handler.handle(request());
    expect(createIssue).toHaveBeenCalledOnce();
    expect(calls.markHandled).toHaveBeenCalledWith('333333333333333333');
    expect(calls.replyToMessage).toHaveBeenCalledWith(
      '333333333333333333',
      '✅ Ticket **SDK reconnect loses guild state** ([#147](<https://github.com/avalon-initiative/avalon-sdks/issues/147>)) filed',
      undefined,
    );
    expect(calls.editReply).toHaveBeenCalledWith(RESPONSES.done);
  });

  it('reports an expired form and files nothing', async () => {
    const { handler, calls, request, createIssue } = setup();
    await handler.handle(request({ customId: 'file-issue:unknown' }));
    expect(calls.editReply).toHaveBeenCalledWith(RESPONSES.expired);
    expect(createIssue).not.toHaveBeenCalled();
  });

  it('refuses a submission from a different user', async () => {
    const { handler, calls, request, createIssue } = setup();
    await handler.handle(request({ userId: 'intruder' }));
    expect(calls.editReply).toHaveBeenCalledWith(RESPONSES.expired);
    expect(createIssue).not.toHaveBeenCalled();
  });

  it('cannot be submitted twice', async () => {
    const { handler, calls, request, createIssue } = setup();
    await handler.handle(request());
    await handler.handle(request());
    expect(createIssue).toHaveBeenCalledOnce();
    expect(calls.editReply).toHaveBeenLastCalledWith(RESPONSES.expired);
  });

  it('rejects a form with no selection', async () => {
    const { handler, calls, request, createIssue } = setup();
    await handler.handle(
      request({ fields: { getStringSelectValues: () => [], getTextInputValue: () => 't' } }),
    );
    expect(calls.editReply).toHaveBeenCalledWith(RESPONSES.invalidForm);
    expect(createIssue).not.toHaveBeenCalled();
  });

  it('explains a repository the app is not installed on', async () => {
    const { handler, calls, request } = setup(
      vi.fn().mockRejectedValue(new RepositoryNotAccessibleError('x/y')),
    );
    await handler.handle(request());
    expect(calls.editReply).toHaveBeenCalledWith(RESPONSES.repoNotAccessible);
    expect(calls.replyToMessage).not.toHaveBeenCalled();
  });

  it('hides unexpected errors behind a generic message', async () => {
    const { handler, calls, request } = setup(vi.fn().mockRejectedValue(new Error('token=abc')));
    await handler.handle(request());
    expect(calls.editReply).toHaveBeenCalledWith(RESPONSES.unexpected);
  });

  it('still succeeds when the marker reaction fails', async () => {
    const { handler, calls, request } = setup();
    calls.markHandled.mockRejectedValue(new Error('missing permission'));
    await handler.handle(request());
    expect(calls.replyToMessage).toHaveBeenCalled();
    expect(calls.editReply).toHaveBeenCalledWith(RESPONSES.done);
  });

  describe('promotion button', () => {
    const decisionFields = {
      getStringSelectValues: (id: string) => (id === 'kind' ? ['decision'] : ['sdks']),
      getTextInputValue: (id: string) => (id === 'title' ? 'Adopt X' : ''),
    };

    it('is attached to a decision when promotion is configured', async () => {
      const { handler, calls, request } = setup(undefined, true);
      await handler.handle(request({ fields: decisionFields }));
      expect(calls.replyToMessage).toHaveBeenCalledWith('333333333333333333', expect.any(String), {
        customId: 'promote-adr:sdks:147',
        label: 'Promote to ADR',
      });
    });

    it('is left off when promotion is not configured', async () => {
      const { handler, calls, request } = setup(undefined, false);
      await handler.handle(request({ fields: decisionFields }));
      expect(calls.replyToMessage.mock.calls[0]?.[2]).toBeUndefined();
    });

    it('is left off for other issue types', async () => {
      const { handler, calls, request } = setup(undefined, true);
      await handler.handle(request());
      expect(calls.replyToMessage.mock.calls[0]?.[2]).toBeUndefined();
    });
  });
});
