import type { CreatedIssue, NewIssue } from './issue.js';

export interface IssueTracker {
  createIssue(issue: NewIssue): Promise<CreatedIssue>;
  /** Throws IssueNotFoundError when the issue is missing or not visible to the app. */
  getIssue(repo: string, number: number): Promise<CreatedIssue>;
  addComment(repo: string, number: number, body: string): Promise<void>;
}
