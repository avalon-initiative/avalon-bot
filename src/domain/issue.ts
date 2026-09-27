import type { IssueKind } from './issue-kind.js';
import type { SourceMessage } from './source-message.js';

export interface FileIssueRequest {
  readonly kind: IssueKind;
  readonly repoKey: string;
  readonly title: string;
  readonly notes: string;
  readonly source: SourceMessage;
  readonly filedBy: string;
}

export interface NewIssue {
  readonly repo: string;
  readonly title: string;
  readonly body: string;
  readonly labels: readonly string[];
}

export interface CreatedIssue {
  readonly repo: string;
  readonly number: number;
  readonly title: string;
  readonly url: string;
  readonly labelsApplied: boolean;
}

export interface ClosedIssue {
  readonly repo: string;
  readonly number: number;
  readonly title: string;
  readonly url: string;
  readonly body: string;
  readonly closedAt: Date;
  /** GitHub's close reason, for example `completed` or `not_planned`. */
  readonly stateReason: string | null;
  /** True when a GitHub App or other bot account opened the issue. */
  readonly authoredByBot: boolean;
}

export interface IssueDetails {
  readonly repo: string;
  readonly number: number;
  readonly title: string;
  readonly url: string;
  readonly body: string;
  readonly authoredByBot: boolean;
}

export interface OpenedPullRequest {
  readonly repo: string;
  readonly number: number;
  readonly title: string;
  readonly url: string;
  readonly body: string;
  readonly createdAt: Date;
}
