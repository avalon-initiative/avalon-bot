import type { CreatedIssue, NewIssue } from './issue.js';

export interface IssueTracker {
  createIssue(issue: NewIssue): Promise<CreatedIssue>;
}
