import { IssueNotFoundError, RepositoryNotAccessibleError } from '../domain/errors.js';
import type { CreatedIssue, NewIssue } from '../domain/issue.js';
import type { IssueTracker } from '../domain/ports.js';
import type { GitHubAppClient, GitHubRequester } from './app-client.js';
import { httpStatusOf } from './http-status.js';

interface IssueResponse {
  readonly number: number;
  readonly html_url: string;
  readonly title: string;
}

export class OctokitIssueTracker implements IssueTracker {
  private readonly installations = new Map<string, number>();

  constructor(private readonly github: GitHubAppClient) {}

  async createIssue(issue: NewIssue): Promise<CreatedIssue> {
    const [owner = '', repo = ''] = issue.repo.split('/');
    const client = await this.github.clientFor(await this.installationFor(owner, repo, issue.repo));
    const params = { owner, repo, title: issue.title, body: issue.body };

    try {
      const { data } = await client.request('POST /repos/{owner}/{repo}/issues', {
        ...params,
        labels: [...issue.labels],
      });
      return toCreated(issue.repo, data as IssueResponse, true);
    } catch (error) {
      if (httpStatusOf(error) !== 422 || issue.labels.length === 0) throw error;
      // A missing or unassignable label must not block filing the issue itself.
      const { data } = await client.request('POST /repos/{owner}/{repo}/issues', params);
      return toCreated(issue.repo, data as IssueResponse, false);
    }
  }

  async getIssue(repo: string, number: number): Promise<CreatedIssue> {
    const [owner = '', name = ''] = repo.split('/');
    const client = await this.clientFor(owner, name, repo);
    try {
      const { data } = await client.request('GET /repos/{owner}/{repo}/issues/{issue_number}', {
        owner,
        repo: name,
        issue_number: number,
      });
      return toCreated(repo, data as IssueResponse, true);
    } catch (error) {
      if (httpStatusOf(error) === 404 || httpStatusOf(error) === 410)
        throw new IssueNotFoundError(repo, number);
      throw error;
    }
  }

  async addComment(repo: string, number: number, body: string): Promise<void> {
    const [owner = '', name = ''] = repo.split('/');
    const client = await this.clientFor(owner, name, repo);
    await client.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
      owner,
      repo: name,
      issue_number: number,
      body,
    });
  }

  private async clientFor(owner: string, repo: string, fullName: string): Promise<GitHubRequester> {
    return this.github.clientFor(await this.installationFor(owner, repo, fullName));
  }

  private async installationFor(owner: string, repo: string, fullName: string): Promise<number> {
    const cached = this.installations.get(fullName);
    if (cached !== undefined) return cached;
    try {
      const id = await this.github.installationIdFor(owner, repo);
      this.installations.set(fullName, id);
      return id;
    } catch (error) {
      if (httpStatusOf(error) === 404) throw new RepositoryNotAccessibleError(fullName);
      throw error;
    }
  }
}

function toCreated(repo: string, data: IssueResponse, labelsApplied: boolean): CreatedIssue {
  return { repo, number: data.number, title: data.title, url: data.html_url, labelsApplied };
}
