import { IssueNotFoundError, RepositoryNotAccessibleError } from '../domain/errors.js';
import type {
  AdrPromotion,
  ClosedIssue,
  CreatedIssue,
  IssueDetails,
  NewIssue,
  OpenedPullRequest,
} from '../domain/issue.js';
import type { IssueTracker } from '../domain/ports.js';
import type { GitHubAppClient, GitHubRequester } from './app-client.js';
import { httpStatusOf } from './http-status.js';

interface IssueResponse {
  readonly number: number;
  readonly html_url: string;
  readonly title: string;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 5;

interface ListedIssue extends IssueResponse {
  readonly body?: string | null;
  readonly closed_at?: string | null;
  readonly state_reason?: string | null;
  readonly pull_request?: unknown;
  readonly user?: { readonly type?: string } | null;
  readonly labels?: readonly (string | { readonly name?: string })[];
  readonly state?: string;
}

interface ListedPull extends IssueResponse {
  readonly body?: string | null;
  readonly created_at: string;
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

  async getIssueDetails(repo: string, number: number): Promise<IssueDetails> {
    const [owner = '', name = ''] = repo.split('/');
    const client = await this.clientFor(owner, name, repo);
    try {
      const { data } = await client.request('GET /repos/{owner}/{repo}/issues/{issue_number}', {
        owner,
        repo: name,
        issue_number: number,
      });
      const issue = data as ListedIssue;
      return {
        repo,
        number: issue.number,
        title: issue.title,
        url: issue.html_url,
        body: issue.body ?? '',
        authoredByBot: issue.user?.type === 'Bot',
        labels: (issue.labels ?? []).map((l) => (typeof l === 'string' ? l : (l.name ?? ''))),
        open: issue.state === 'open',
      };
    } catch (error) {
      if (httpStatusOf(error) === 404 || httpStatusOf(error) === 410)
        throw new IssueNotFoundError(repo, number);
      throw error;
    }
  }

  async promoteToAdr(repo: string, number: number, promotion: AdrPromotion): Promise<void> {
    const [owner = '', name = ''] = repo.split('/');
    const client = await this.clientFor(owner, name, repo);
    const issue = { owner, repo: name, issue_number: number };
    await client.request('POST /repos/{owner}/{repo}/issues/{issue_number}/labels', {
      ...issue,
      labels: [promotion.label],
    });
    await client.request('PATCH /repos/{owner}/{repo}/issues/{issue_number}', {
      ...issue,
      title: promotion.title,
      body: promotion.body,
      state: 'closed',
      state_reason: 'completed',
    });
  }

  async listOpenedPullsSince(repo: string, since: Date): Promise<readonly OpenedPullRequest[]> {
    const [owner = '', name = ''] = repo.split('/');
    const client = await this.clientFor(owner, name, repo);
    const opened: OpenedPullRequest[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { data } = await client.request('GET /repos/{owner}/{repo}/pulls', {
        owner,
        repo: name,
        state: 'all',
        sort: 'created',
        direction: 'desc',
        per_page: PAGE_SIZE,
        page,
      });
      const items = data as readonly ListedPull[];
      for (const item of items) {
        const createdAt = new Date(item.created_at);
        if (createdAt < since) return opened;
        opened.push({
          repo,
          number: item.number,
          title: item.title,
          url: item.html_url,
          body: item.body ?? '',
          createdAt,
        });
      }
      if (items.length < PAGE_SIZE) break;
    }
    return opened;
  }

  async listClosedSince(repo: string, since: Date): Promise<readonly ClosedIssue[]> {
    const [owner = '', name = ''] = repo.split('/');
    const client = await this.clientFor(owner, name, repo);
    const closed: ClosedIssue[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { data } = await client.request('GET /repos/{owner}/{repo}/issues', {
        owner,
        repo: name,
        state: 'closed',
        since: since.toISOString(),
        sort: 'updated',
        direction: 'desc',
        per_page: PAGE_SIZE,
        page,
      });
      const items = data as readonly ListedIssue[];
      for (const item of items) {
        if (item.pull_request !== undefined || item.closed_at === null || item.closed_at === undefined)
          continue;
        const closedAt = new Date(item.closed_at);
        if (closedAt < since) continue;
        closed.push({
          repo,
          number: item.number,
          title: item.title,
          url: item.html_url,
          body: item.body ?? '',
          closedAt,
          stateReason: item.state_reason ?? null,
          authoredByBot: item.user?.type === 'Bot',
        });
      }
      if (items.length < PAGE_SIZE) break;
    }
    return closed;
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
