import { describe, expect, it } from 'vitest';
import {
  isPromoteCustomId,
  parsePromoteCustomId,
  promoteCustomId,
} from '../../../src/discord/promote-button.js';

describe('promote button custom id', () => {
  it('round-trips the repository key and issue number', () => {
    const id = promoteCustomId({ repoKey: 'common-ui', number: 147 });
    expect(id).toBe('promote-adr:common-ui:147');
    expect(isPromoteCustomId(id)).toBe(true);
    expect(parsePromoteCustomId(id)).toEqual({ repoKey: 'common-ui', number: 147 });
  });

  it('stays within Discord’s 100 character custom id limit for the longest key', () => {
    expect(promoteCustomId({ repoKey: 'a'.repeat(32), number: 999_999_999 }).length).toBeLessThan(100);
  });

  it.each(['promote-adr:', 'promote-adr:sdks', 'promote-adr:sdks:abc', 'promote-adr:SDKS:1', 'file-issue:1'])(
    'rejects %s',
    (id) => {
      expect(parsePromoteCustomId(id)).toBeUndefined();
    },
  );

  it('does not claim other custom ids', () => {
    expect(isPromoteCustomId('link-issue:1')).toBe(false);
  });
});
