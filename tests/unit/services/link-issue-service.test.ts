import { describe, expect, it, vi } from 'vitest';
import { InvalidIssueReferenceError, IssueNotFoundError } from '../../../src/domain/errors.js';
import type { IssueTracker } from '../../../src/domain/ports.js';
import type { CreatedIssue } from '../../../src/domain/issue.js';
import { LinkIssueService } from '../../../src/services/link-issue-service.js';
import { makeConfig, makeSource } from '../../support/fixtures.js';

const ISSUE: CreatedIssue = {
  repo: 'avalon-initiative/avalon-sdks',
  number: 12,
  title: 'Existing',
  url: 'https://github.com/avalon-initiative/avalon-sdks/issues/12',
  labelsApplied: true,
};

function setup(options: { comment?: boolean; getIssue?: IssueTracker['getIssue'] } = {}) {
  const getIssue = vi.fn(options.getIssue ?? (() => Promise.resolve(ISSUE)));
  const addComment = vi.fn().mockResolvedValue(undefined);
  const service = new LinkIssueService(makeConfig({ commentOnLinkedIssue: options.comment ?? true }), {
    getIssue,
    addComment,
  });
  return { service, getIssue, addComment };
}

const request = { reference: 'sdks#12', source: makeSource(), linkedBy: 'Bob' };

describe('LinkIssueService', () => {
  it('resolves the issue and comments with the Discord source', async () => {
    const { service, getIssue, addComment } = setup();
    const linked = await service.link(request);
    expect(getIssue).toHaveBeenCalledWith('avalon-initiative/avalon-sdks', 12);
    expect(addComment).toHaveBeenCalledOnce();
    const body = addComment.mock.calls[0]?.[2] as string;
    expect(body).toContain('> **Alice:** The SDK reconnects');
    expect(body).toContain('- Source message: https://discord.com/channels/1/2/3');
    expect(body).toContain('Bob (Discord)');
    expect(linked).toEqual({ issue: ISSUE, commented: true });
  });

  it('skips the comment when disabled', async () => {
    const { service, addComment } = setup({ comment: false });
    expect(await service.link(request)).toEqual({ issue: ISSUE, commented: false });
    expect(addComment).not.toHaveBeenCalled();
  });

  it('still links when the comment cannot be posted', async () => {
    const { service, addComment } = setup();
    addComment.mockRejectedValue(new Error('403'));
    expect(await service.link(request)).toEqual({ issue: ISSUE, commented: false });
  });

  it('propagates a missing issue without commenting', async () => {
    const getIssue = () => Promise.reject(new IssueNotFoundError('avalon-initiative/avalon-sdks', 12));
    const { service, addComment } = setup({ getIssue });
    await expect(service.link(request)).rejects.toBeInstanceOf(IssueNotFoundError);
    expect(addComment).not.toHaveBeenCalled();
  });

  it('rejects repositories outside the config before any API call', async () => {
    const { service, getIssue } = setup();
    await expect(service.link({ ...request, reference: 'other/repo#1' })).rejects.toBeInstanceOf(
      InvalidIssueReferenceError,
    );
    expect(getIssue).not.toHaveBeenCalled();
  });
});
