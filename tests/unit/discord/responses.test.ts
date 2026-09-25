import { describe, expect, it } from 'vitest';
import { issueCreatedMessage } from '../../../src/discord/responses.js';

const ISSUE = {
  repo: 'avalon-initiative/avalon-sdks',
  number: 147,
  title: 'SDK reconnect loses guild state',
  url: 'https://github.com/avalon-initiative/avalon-sdks/issues/147',
  labelsApplied: true,
};

describe('issueCreatedMessage', () => {
  it('names the ticket and links the issue number without an embed', () => {
    expect(issueCreatedMessage(ISSUE)).toBe(
      '✅ Ticket **SDK reconnect loses guild state** ([#147](<https://github.com/avalon-initiative/avalon-sdks/issues/147>)) filed',
    );
  });

  it('mentions a skipped label', () => {
    expect(issueCreatedMessage({ ...ISSUE, labelsApplied: false })).toContain('label could not be applied');
  });
});
