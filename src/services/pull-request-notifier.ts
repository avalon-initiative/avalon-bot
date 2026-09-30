import type { AppConfig } from '../config/schema.js';
import type { IssueDetails, OpenedPullRequest } from '../domain/issue.js';
import { IssueNotFoundError } from '../domain/errors.js';
import type { DiscordNotifier, IssueTracker } from '../domain/ports.js';
import type { Logger } from '../util/logger.js';
import { extractClosingReferences } from './closing-references.js';
import { resolveNoteTarget } from './note-target.js';

const MAX_REMEMBERED = 2000;

export function pullRequestNote(pull: OpenedPullRequest, issue: IssueDetails): string {
  return `🔀 A pull request ([#${String(pull.number)}](<${pull.url}>)) was opened for ticket **${issue.title}** ([#${String(issue.number)}](<${issue.url}>)).`;
}

/**
 * Tells the originating Discord message when a pull request references an issue the bot filed.
 * A note is posted once per issue; the cursor and that set live in memory only.
 */
export class PullRequestNotifier {
  private readonly cursors = new Map<string, Date>();
  private readonly notified = new Set<string>();

  constructor(
    private readonly config: Pick<AppConfig, 'guildId' | 'repositories' | 'notifications'>,
    private readonly tracker: Pick<IssueTracker, 'listOpenedPullsSince' | 'getIssueDetails'>,
    private readonly discord: DiscordNotifier,
    private readonly logger: Logger,
    private readonly startedAt: Date,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async poll(): Promise<void> {
    for (const { repo } of this.config.repositories) {
      const polledAt = this.now();
      try {
        const pulls = await this.tracker.listOpenedPullsSince(repo, this.cursors.get(repo) ?? this.startedAt);
        let delivered = true;
        for (const pull of pulls) delivered = (await this.notify(pull)) && delivered;
        // A failed post keeps the cursor so the pull request is retried; the notified set stops repeats.
        if (delivered) this.cursors.set(repo, polledAt);
      } catch (error) {
        this.logger.warn('pull request poll failed', { repo, error: String(error) });
      }
    }
  }

  private async notify(pull: OpenedPullRequest): Promise<boolean> {
    let delivered = true;
    for (const reference of extractClosingReferences(pull.body, pull.repo, this.config.repositories)) {
      const key = `${reference.repo}#${String(reference.number)}`;
      if (this.notified.has(key)) continue;
      try {
        const issue = await this.tracker.getIssueDetails(reference.repo, reference.number);
        const target = resolveNoteTarget(this.config, issue);
        if (target) await this.discord.postNote(target, pullRequestNote(pull, issue));
        this.remember(key);
        if (target) this.logger.info('pull request note posted', { issue: key, pull: pull.number });
      } catch (error) {
        if (error instanceof IssueNotFoundError) {
          this.remember(key);
          continue;
        }
        delivered = false;
        this.logger.warn('pull request note failed', { issue: key, pull: pull.number, error: String(error) });
      }
    }
    return delivered;
  }

  private remember(key: string): void {
    this.notified.add(key);
    if (this.notified.size > MAX_REMEMBERED) {
      const oldest = this.notified.values().next().value;
      if (oldest !== undefined) this.notified.delete(oldest);
    }
  }
}
