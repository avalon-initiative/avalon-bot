import { describe, expect, it, vi } from 'vitest';
import {
  AlreadyPromotedError,
  IssueNotFoundError,
  NotADecisionError,
  UnknownRepositoryError,
} from '../../../src/domain/errors.js';
import type { AdrPromotion, IssueDetails } from '../../../src/domain/issue.js';
import { renderBody } from '../../../src/render/issue-body.js';
import { PromoteDecisionService } from '../../../src/services/promote-decision-service.js';
import { makeConfig, makeRequest } from '../../support/fixtures.js';

function decision(overrides: Partial<IssueDetails> = {}): IssueDetails {
  return {
    repo: 'avalon-initiative/avalon-sdks',
    number: 12,
    title: '[Decision] Adopt X',
    url: 'https://github.com/avalon-initiative/avalon-sdks/issues/12',
    body: renderBody(makeRequest({ kind: 'decision', notes: 'Adopt X.' })),
    authoredByBot: true,
    labels: ['decision'],
    open: true,
    ...overrides,
  };
}

function setup(details: IssueDetails | Error = decision()) {
  const getIssueDetails = vi
    .fn()
    .mockImplementation(() =>
      details instanceof Error ? Promise.reject(details) : Promise.resolve(details),
    );
  const promoteToAdr = vi.fn().mockResolvedValue(undefined);
  const service = new PromoteDecisionService(makeConfig(), { getIssueDetails, promoteToAdr });
  return { service, getIssueDetails, promoteToAdr };
}

const request = { repoKey: 'sdks', number: 12, promotedBy: 'Carol' };

describe('PromoteDecisionService', () => {
  it('labels, rewrites and closes an open decision the bot filed', async () => {
    const { service, getIssueDetails, promoteToAdr } = setup();
    await service.promote(request);
    expect(getIssueDetails).toHaveBeenCalledWith('avalon-initiative/avalon-sdks', 12);
    expect(promoteToAdr).toHaveBeenCalledOnce();
    const [repo, number, promotion] = promoteToAdr.mock.calls[0] as [string, number, AdrPromotion];
    expect([repo, number]).toEqual(['avalon-initiative/avalon-sdks', 12]);
    expect(promotion).toMatchObject({ title: 'ADR: Adopt X', label: 'architecture-decision-record' });
    expect(promotion.body).toContain('**Status:** Decided');
    expect(promotion.body).toContain('- Recorded by: Carol (Discord)');
  });

  it('refuses an issue that is already an ADR', async () => {
    const { service, promoteToAdr } = setup(
      decision({ labels: ['decision', 'architecture-decision-record'] }),
    );
    await expect(service.promote(request)).rejects.toBeInstanceOf(AlreadyPromotedError);
    expect(promoteToAdr).not.toHaveBeenCalled();
  });

  it.each([
    ['closed', decision({ open: false })],
    ['not labeled as a decision', decision({ labels: ['type: bug'] })],
    ['not opened by the bot', decision({ authoredByBot: false })],
    ['not in the bot format', decision({ body: 'Some other decision text' })],
  ])('refuses an issue that is %s', async (_name, details) => {
    const { service, promoteToAdr } = setup(details);
    await expect(service.promote(request)).rejects.toBeInstanceOf(NotADecisionError);
    expect(promoteToAdr).not.toHaveBeenCalled();
  });

  it('rejects an unknown repository key before any API call', async () => {
    const { service, getIssueDetails } = setup();
    await expect(service.promote({ ...request, repoKey: 'nope' })).rejects.toBeInstanceOf(
      UnknownRepositoryError,
    );
    expect(getIssueDetails).not.toHaveBeenCalled();
  });

  it('propagates a missing issue', async () => {
    const { service } = setup(new IssueNotFoundError('r/r', 12));
    await expect(service.promote(request)).rejects.toBeInstanceOf(IssueNotFoundError);
  });
});
