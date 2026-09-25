import type { IssueKind } from '../domain/issue-kind.js';

export interface KindTemplate {
  /** Heading above the user-supplied details. */
  readonly heading: string;
  /** Heading level marker, `##` normally, `#` for the decision statement. */
  readonly level: '#' | '##';
  /** Heading above the quoted Discord message. */
  readonly contextHeading: string;
}

export const TEMPLATES: Readonly<Record<IssueKind, KindTemplate>> = {
  bug: { heading: 'Problem', level: '##', contextHeading: 'Discord Context' },
  feature: { heading: 'Proposed Feature', level: '##', contextHeading: 'Discord Context' },
  task: { heading: 'Task', level: '##', contextHeading: 'Discord Context' },
  decision: { heading: 'Decision', level: '#', contextHeading: 'Context' },
};
