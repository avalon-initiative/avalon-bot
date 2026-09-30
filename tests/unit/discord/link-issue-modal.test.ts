import { describe, expect, it } from 'vitest';
import {
  buildLinkIssueModal,
  linkPendingIdFrom,
  parseLinkSubmission,
} from '../../../src/discord/modal/link-issue-modal.js';

describe('link issue modal', () => {
  it('embeds the pending id in its custom id', () => {
    const json = buildLinkIssueModal('abc').toJSON();
    expect(json.custom_id).toBe('link-issue:abc');
    expect(linkPendingIdFrom(json.custom_id)).toBe('abc');
  });

  it('does not claim filing modals', () => {
    expect(linkPendingIdFrom('file-issue:abc')).toBeUndefined();
  });

  it('trims the submitted reference', () => {
    expect(parseLinkSubmission({ getTextInputValue: () => '  sdks#12 ' })).toBe('sdks#12');
  });
});
