import type { AppConfig } from '../config/schema.js';
import { AlreadyPromotedError, NotADecisionError, UnknownRepositoryError } from '../domain/errors.js';
import type { IssueDetails } from '../domain/issue.js';
import type { IssueTracker } from '../domain/ports.js';
import { renderAdrBody, renderAdrTitle } from '../render/adr.js';

export interface PromoteDecisionRequest {
  readonly repoKey: string;
  readonly number: number;
  readonly promotedBy: string;
}

export class PromoteDecisionService {
  constructor(
    private readonly config: Pick<AppConfig, 'repositories' | 'labels'>,
    private readonly tracker: Pick<IssueTracker, 'getIssueDetails' | 'promoteToAdr'>,
  ) {}

  async promote(request: PromoteDecisionRequest): Promise<IssueDetails> {
    const repository = this.config.repositories.find((r) => r.key === request.repoKey);
    if (!repository) throw new UnknownRepositoryError(request.repoKey);

    const issue = await this.tracker.getIssueDetails(repository.repo, request.number);
    const { adr, decision } = this.config.labels;
    if (issue.labels.includes(adr)) throw new AlreadyPromotedError(issue.repo, issue.number);

    const body =
      issue.authoredByBot && issue.open && issue.labels.includes(decision)
        ? renderAdrBody(issue.body, issue.title, request.promotedBy)
        : undefined;
    if (body === undefined) throw new NotADecisionError(issue.repo, issue.number);

    await this.tracker.promoteToAdr(issue.repo, issue.number, {
      title: renderAdrTitle(issue.title),
      body,
      label: adr,
    });
    return issue;
  }
}
