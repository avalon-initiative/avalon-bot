export const ISSUE_KINDS = ['bug', 'feature', 'task', 'decision'] as const;

export type IssueKind = (typeof ISSUE_KINDS)[number];

export interface IssueKindInfo {
  readonly kind: IssueKind;
  readonly emoji: string;
  readonly displayName: string;
}

export const ISSUE_KIND_INFO: Readonly<Record<IssueKind, IssueKindInfo>> = {
  bug: { kind: 'bug', emoji: '🐛', displayName: 'Bug' },
  feature: { kind: 'feature', emoji: '✨', displayName: 'Feature' },
  task: { kind: 'task', emoji: '📌', displayName: 'Task' },
  decision: { kind: 'decision', emoji: '📐', displayName: 'Decision' },
};

export function isIssueKind(value: string): value is IssueKind {
  return (ISSUE_KINDS as readonly string[]).includes(value);
}
