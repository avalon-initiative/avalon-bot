import { describe, expect, it } from 'vitest';
import { neutralize, quote, singleLine, truncate } from '../../../src/render/sanitize.js';

describe('neutralize', () => {
  it('breaks @mentions', () => {
    expect(neutralize('ping @octocat now')).not.toContain('@octocat');
  });

  it('breaks #123 issue references', () => {
    expect(neutralize('see #123')).not.toContain('#123');
  });

  it('escapes HTML openers', () => {
    expect(neutralize('<script>x</script>')).toBe('&lt;script>x&lt;/script>');
  });

  it('leaves ordinary text alone', () => {
    expect(neutralize('mail me at 5 # of times')).toBe('mail me at 5 # of times');
  });
});

describe('text helpers', () => {
  it('truncates with an ellipsis', () => {
    expect(truncate('abcdef', 4)).toBe('abc…');
    expect(truncate('abc', 4)).toBe('abc');
  });

  it('collapses whitespace', () => {
    expect(singleLine('  a \n\n b\t c ')).toBe('a b c');
  });

  it('quotes every line, keeping blank ones', () => {
    expect(quote('a\n\nb')).toBe('> a\n>\n> b');
  });
});
