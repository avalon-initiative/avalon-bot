import { afterEach, describe, expect, it, vi } from 'vitest';
import { startInterval } from '../../../src/util/scheduler.js';
import { silentLogger } from '../../support/fixtures.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('startInterval', () => {
  it('runs after each interval, not immediately', async () => {
    vi.useFakeTimers();
    const task = vi.fn().mockResolvedValue(undefined);
    const stop = startInterval(task, 1000, silentLogger, 't');
    expect(task).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(task).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(task).toHaveBeenCalledTimes(2);
    stop();
  });

  it('never overlaps a slow run', async () => {
    vi.useFakeTimers();
    let running = 0;
    let maxRunning = 0;
    const task = vi.fn(async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 3500));
      running--;
    });
    const stop = startInterval(task, 1000, silentLogger, 't');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(maxRunning).toBe(1);
    stop();
  });

  it('keeps running after a failure and stops when asked', async () => {
    vi.useFakeTimers();
    const task = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);
    const stop = startInterval(task, 1000, silentLogger, 't');
    await vi.advanceTimersByTimeAsync(2000);
    expect(task).toHaveBeenCalledTimes(2);
    stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(task).toHaveBeenCalledTimes(2);
  });
});
