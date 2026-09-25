import { describe, expect, it } from 'vitest';
import { createLogger } from '../../../src/util/logger.js';
import { RateLimiter } from '../../../src/util/rate-limiter.js';
import { TtlStore } from '../../../src/util/ttl-store.js';

describe('RateLimiter', () => {
  it('allows up to the limit per key within the window, then recovers', () => {
    let now = 0;
    const limiter = new RateLimiter(2, 1000, () => now);
    expect(limiter.tryAcquire('a')).toBe(true);
    expect(limiter.tryAcquire('a')).toBe(true);
    expect(limiter.tryAcquire('a')).toBe(false);
    expect(limiter.tryAcquire('b')).toBe(true);
    now = 1001;
    expect(limiter.tryAcquire('a')).toBe(true);
  });
});

describe('TtlStore', () => {
  it('returns an entry once, before it expires', () => {
    const now = 0;
    const store = new TtlStore<string>(1000, () => now);
    store.set('k', 'v');
    expect(store.take('k')).toBe('v');
    expect(store.take('k')).toBeUndefined();
  });

  it('drops expired entries', () => {
    let now = 0;
    const store = new TtlStore<string>(1000, () => now);
    store.set('k', 'v');
    now = 1000;
    expect(store.take('k')).toBeUndefined();
  });
});

describe('createLogger', () => {
  it('writes JSON lines at or above the level', () => {
    const lines: string[] = [];
    const logger = createLogger('warn', (l) => lines.push(l));
    logger.info('hidden');
    logger.error('shown', { code: 5 });
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? '{}')).toMatchObject({ level: 'error', message: 'shown', code: 5 });
  });
});
