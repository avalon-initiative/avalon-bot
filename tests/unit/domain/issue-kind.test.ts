import { describe, expect, it } from 'vitest';
import { ISSUE_KINDS, ISSUE_KIND_INFO, isIssueKind } from '../../../src/domain/issue-kind.js';

describe('issue kinds', () => {
  it('describes every kind', () => {
    for (const kind of ISSUE_KINDS) expect(ISSUE_KIND_INFO[kind].kind).toBe(kind);
  });

  it('recognizes only known kinds', () => {
    expect(isIssueKind('bug')).toBe(true);
    expect(isIssueKind('epic')).toBe(false);
  });
});
