import { describe, expect, it } from 'vitest';
import { isAuthorized } from '../../../src/discord/permissions.js';
import { hasHandledMarker } from '../../../src/discord/reactions.js';

describe('isAuthorized', () => {
  it('needs at least one allowed role', () => {
    expect(isAuthorized(['1', '2'], ['2', '3'])).toBe(true);
    expect(isAuthorized(['1'], ['2'])).toBe(false);
    expect(isAuthorized([], ['2'])).toBe(false);
  });
});

describe('hasHandledMarker', () => {
  it("counts only the bot's own check mark", () => {
    expect(hasHandledMarker([{ emoji: { name: '✅' }, me: true }])).toBe(true);
  });

  it("ignores other users' check marks and the bot's other reactions", () => {
    expect(hasHandledMarker([{ emoji: { name: '✅' }, me: false }])).toBe(false);
    expect(hasHandledMarker([{ emoji: { name: '👍' }, me: true }])).toBe(false);
    expect(hasHandledMarker([])).toBe(false);
  });
});
