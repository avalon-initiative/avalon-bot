import { describe, expect, it, vi } from 'vitest';
import { PromoteAdrHandler, type PromoteRequest } from '../../../src/discord/handlers/promote-adr-handler.js';
import { RESPONSES } from '../../../src/discord/responses.js';
import {
  AlreadyPromotedError,
  IssueNotFoundError,
  NotADecisionError,
  RepositoryNotAccessibleError,
} from '../../../src/domain/errors.js';
import type { IssueDetails } from '../../../src/domain/issue.js';
import type { PromoteDecisionService } from '../../../src/services/promote-decision-service.js';
import { GUILD_ID, silentLogger } from '../../support/fixtures.js';

const MAINTAINER = '555555555555555555';
const ISSUE = { repo: 'avalon-initiative/avalon-sdks', number: 12 } as IssueDetails;

function setup(promote = vi.fn().mockResolvedValue(ISSUE)) {
  const handler = new PromoteAdrHandler(
    { guildId: GUILD_ID, maintainerRoleIds: [MAINTAINER] },
    { promote } as unknown as PromoteDecisionService,
    silentLogger,
  );
  const calls = {
    deferEphemeral: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    removeButton: vi.fn().mockResolvedValue(undefined),
  };
  const request = (overrides: Partial<PromoteRequest> = {}): PromoteRequest => ({
    customId: 'promote-adr:sdks:12',
    guildId: GUILD_ID,
    userId: 'u1',
    userName: 'Carol',
    memberRoleIds: [MAINTAINER],
    ...calls,
    ...overrides,
  });
  return { handler, calls, request, promote };
}

describe('PromoteAdrHandler', () => {
  it('promotes for a maintainer, removes the button and confirms privately', async () => {
    const { handler, calls, request, promote } = setup();
    await handler.handle(request());
    expect(promote).toHaveBeenCalledWith({ repoKey: 'sdks', number: 12, promotedBy: 'Carol' });
    expect(calls.removeButton).toHaveBeenCalledOnce();
    expect(calls.editReply).toHaveBeenCalledWith(RESPONSES.promoted);
  });

  it('refuses members without a maintainer role, without touching GitHub', async () => {
    const { handler, calls, request, promote } = setup();
    await handler.handle(request({ memberRoleIds: ['222222222222222222'] }));
    expect(calls.editReply).toHaveBeenCalledWith(RESPONSES.promoteNotAuthorized);
    expect(promote).not.toHaveBeenCalled();
    expect(calls.removeButton).not.toHaveBeenCalled();
  });

  it('ignores clicks from other servers', async () => {
    const { handler, calls, request, promote } = setup();
    await handler.handle(request({ guildId: '999999999999999999' }));
    expect(calls.deferEphemeral).not.toHaveBeenCalled();
    expect(promote).not.toHaveBeenCalled();
  });

  it('rejects a malformed custom id', async () => {
    const { handler, calls, request, promote } = setup();
    await handler.handle(request({ customId: 'promote-adr:garbage' }));
    expect(calls.editReply).toHaveBeenCalledWith(RESPONSES.invalidForm);
    expect(promote).not.toHaveBeenCalled();
  });

  it('removes a stale button and says so when the decision is already an ADR', async () => {
    const { handler, calls, request } = setup(
      vi.fn().mockRejectedValue(new AlreadyPromotedError(ISSUE.repo, 12)),
    );
    await handler.handle(request());
    expect(calls.removeButton).toHaveBeenCalledOnce();
    expect(calls.editReply).toHaveBeenCalledWith(RESPONSES.alreadyPromoted);
  });

  it.each([
    [new NotADecisionError(ISSUE.repo, 12), RESPONSES.notADecision],
    [new IssueNotFoundError(ISSUE.repo, 12), RESPONSES.issueNotFound],
    [new RepositoryNotAccessibleError(ISSUE.repo), RESPONSES.repoNotAccessible],
    [new Error('boom'), RESPONSES.unexpectedPromote],
  ])('maps %s to a clear reply and keeps the button', async (error, message) => {
    const { handler, calls, request } = setup(vi.fn().mockRejectedValue(error));
    await handler.handle(request());
    expect(calls.editReply).toHaveBeenCalledWith(message);
    expect(calls.removeButton).not.toHaveBeenCalled();
  });

  it('still confirms when the button cannot be removed', async () => {
    const { handler, calls, request } = setup();
    calls.removeButton.mockRejectedValue(new Error('missing permission'));
    await handler.handle(request());
    expect(calls.editReply).toHaveBeenCalledWith(RESPONSES.promoted);
  });
});
