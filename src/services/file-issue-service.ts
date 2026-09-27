import type { AppConfig, RepositoryConfig } from '../config/schema.js';
import { InvalidTitleError, UnknownRepositoryError } from '../domain/errors.js';
import type { CreatedIssue, FileIssueRequest } from '../domain/issue.js';
import type { IssueTracker } from '../domain/ports.js';
import { renderBody, renderTitle } from '../render/issue-body.js';

export class FileIssueService {
  constructor(
    private readonly config: Pick<AppConfig, 'repositories' | 'labels'>,
    private readonly tracker: Pick<IssueTracker, 'createIssue'>,
  ) {}

  findRepository(key: string): RepositoryConfig {
    const repository = this.config.repositories.find((r) => r.key === key);
    if (!repository) throw new UnknownRepositoryError(key);
    return repository;
  }

  async file(request: FileIssueRequest): Promise<CreatedIssue> {
    const repository = this.findRepository(request.repoKey);
    const title = renderTitle(request.title);
    if (title.length === 0) throw new InvalidTitleError();
    return this.tracker.createIssue({
      repo: repository.repo,
      title,
      body: renderBody(request),
      labels: [this.config.labels[request.kind]],
    });
  }
}
