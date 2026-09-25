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
