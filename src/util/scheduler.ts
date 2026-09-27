import type { Logger } from './logger.js';

/** Runs `task` every `intervalMs`, never overlapping itself; the first run happens after one interval. */
export function startInterval(
  task: () => Promise<void>,
  intervalMs: number,
  logger: Logger,
  name: string,
): () => void {
  let timer: NodeJS.Timeout | undefined;
  let stopped = false;

  const schedule = (): void => {
    timer = setTimeout(() => {
      task()
        .catch((error: unknown) => {
          logger.error(`${name} failed`, { error: String(error) });
        })
        .finally(() => {
          if (!stopped) schedule();
        });
    }, intervalMs);
  };
  schedule();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
