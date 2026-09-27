import type { AppConfig } from '../config/schema.js';
import type { CreatedIssue } from '../domain/issue.js';
import type { IssueTracker } from '../domain/ports.js';
import type { SourceMessage } from '../domain/source-message.js';
import { renderLinkComment } from '../render/issue-body.js';
import { parseIssueReference } from './issue-reference.js';

export interface LinkIssueRequest {
  readonly reference: string;
  readonly source: SourceMessage;
  readonly linkedBy: string;
}

export interface LinkedIssue {
  readonly issue: CreatedIssue;
  /** False when commenting was disabled or failed; the link itself still succeeded. */
  readonly commented: boolean;
}

export class LinkIssueService {
  constructor(
    private readonly config: Pick<AppConfig, 'repositories' | 'commentOnLinkedIssue'>,
    private readonly tracker: IssueTracker,
  ) {}

  async link(request: LinkIssueRequest): Promise<LinkedIssue> {
    const { repo, number } = parseIssueReference(request.reference, this.config.repositories);
    const issue = await this.tracker.getIssue(repo, number);
    if (!this.config.commentOnLinkedIssue) return { issue, commented: false };
    try {
      await this.tracker.addComment(repo, number, renderLinkComment(request.source, request.linkedBy));
      return { issue, commented: true };
    } catch {
      return { issue, commented: false };
    }
  }
}
