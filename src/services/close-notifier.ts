import type { AppConfig } from '../config/schema.js';
import type { ClosedIssue } from '../domain/issue.js';
import type { DiscordNotifier, IssueTracker } from '../domain/ports.js';
import type { Logger } from '../util/logger.js';
import { resolveNoteTarget } from './note-target.js';

const MAX_REMEMBERED = 2000;

export function issueClosedNote(issue: ClosedIssue): string {
  const how = issue.stateReason === 'not_planned' ? 'closed as not planned' : 'closed';
  return `🔒 Ticket **${issue.title}** ([#${String(issue.number)}](<${issue.url}>)) was ${how}.`;
}

/**
 * Reports closed issues back to the Discord message they were filed from. The since-cursor and the
 * already-notified set live in memory only, so a restart resumes from its own start time.
 */
export class CloseNotifier {
  private readonly cursors = new Map<string, Date>();
  private readonly notified = new Set<string>();

  constructor(
    private readonly config: Pick<AppConfig, 'guildId' | 'repositories' | 'notifications'>,
    private readonly tracker: Pick<IssueTracker, 'listClosedSince'>,
    private readonly discord: DiscordNotifier,
    private readonly logger: Logger,
    private readonly startedAt: Date,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async poll(): Promise<void> {
    for (const { repo } of this.config.repositories) {
      const polledAt = this.now();
      try {
        const closed = await this.tracker.listClosedSince(repo, this.cursors.get(repo) ?? this.startedAt);
        let delivered = true;
        for (const issue of closed) delivered = (await this.notify(issue)) && delivered;
        // A failed post keeps the cursor so the closure is retried; the notified set stops repeats.
        if (delivered) this.cursors.set(repo, polledAt);
      } catch (error) {
        this.logger.warn('close poll failed', { repo, error: String(error) });
      }
    }
  }

  /** False only when a note should have been posted but was not. */
  private async notify(issue: ClosedIssue): Promise<boolean> {
    const target = resolveNoteTarget(this.config, issue);
    if (!target) return true;

    const key = `${issue.repo}#${String(issue.number)}@${issue.closedAt.toISOString()}`;
    if (this.notified.has(key)) return true;
    try {
      await this.discord.postNote(target, issueClosedNote(issue));
    } catch (error) {
      this.logger.warn('close note failed', { repo: issue.repo, number: issue.number, error: String(error) });
      return false;
    }
    this.remember(key);
    this.logger.info('close note posted', { repo: issue.repo, number: issue.number });
    return true;
  }

  private remember(key: string): void {
    this.notified.add(key);
    if (this.notified.size > MAX_REMEMBERED) {
      const oldest = this.notified.values().next().value;
      if (oldest !== undefined) this.notified.delete(oldest);
    }
  }
}
