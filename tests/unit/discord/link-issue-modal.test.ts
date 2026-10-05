import { describe, expect, it } from 'vitest';
import {
  buildLinkIssueModal,
  linkPendingIdFrom,
  parseLinkSubmission,
} from '../../../src/discord/modal/link-issue-modal.js';
import { makeConfig } from '../../support/fixtures.js';

const { repositories } = makeConfig();
const build = (defaultRepoKey?: string) =>
  buildLinkIssueModal({ pendingId: 'abc', repositories, defaultRepoKey });
const fields = (repo: string[], number: string) => ({
  getStringSelectValues: () => repo,
  getTextInputValue: () => number,
});

describe('link issue modal', () => {
  it('embeds the pending id in its custom id', () => {
    const json = build().toJSON();
    expect(json.custom_id).toBe('link-issue:abc');
    expect(linkPendingIdFrom(json.custom_id)).toBe('abc');
  });

  it('offers every configured repository and preselects the default', () => {
    const json = JSON.stringify(build('hub').toJSON());
    expect(json).toContain('"value":"sdks"');
    expect(json).toMatch(/"value":"hub"[^}]*"default":true/);
  });

  it('does not claim filing modals', () => {
    expect(linkPendingIdFrom('file-issue:abc')).toBeUndefined();
  });

  it('builds a key#number reference from the selection and trimmed number', () => {
    expect(parseLinkSubmission(fields(['sdks'], ' 12 '))).toBe('sdks#12');
    expect(parseLinkSubmission(fields(['sdks'], '#12'))).toBe('sdks#12');
  });

  it('yields an unparseable reference when nothing is selected', () => {
    expect(parseLinkSubmission(fields([], '12'))).toBe('#12');
  });
});
