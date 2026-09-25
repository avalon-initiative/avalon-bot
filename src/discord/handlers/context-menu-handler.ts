import type { ModalBuilder } from 'discord.js';
import type { AppConfig } from '../../config/schema.js';
import type { Logger } from '../../util/logger.js';
import type { RateLimiter } from '../../util/rate-limiter.js';
import { toSourceMessage, type MessageLike } from '../mappers/source-message-mapper.js';
import { buildFileIssueModal } from '../modal/file-issue-modal.js';
import { isAuthorized } from '../permissions.js';
import type { PendingStore } from '../pending.js';
import { hasHandledMarker, type ReactionLike } from '../reactions.js';
import { RESPONSES } from '../responses.js';

export interface ContextMenuRequest {
  readonly interactionId: string;
  readonly guildId: string | null;
  readonly userId: string;
  readonly memberRoleIds: readonly string[];
  readonly channelId: string;
  readonly parentChannelId: string | null;
  readonly message: MessageLike & { readonly reactions: Iterable<ReactionLike> };
  replyEphemeral(content: string): Promise<void>;
  showModal(modal: ModalBuilder): Promise<void>;
}

export class ContextMenuHandler {
  constructor(
    private readonly config: AppConfig,
    private readonly pending: PendingStore,
    private readonly rateLimiter: RateLimiter,
    private readonly logger: Logger,
  ) {}

  async handle(request: ContextMenuRequest): Promise<void> {
    if (request.guildId !== this.config.guildId) return;

    if (!isAuthorized(request.memberRoleIds, this.config.allowedRoleIds)) {
      this.logger.info('denied: missing role', { userId: request.userId });
      await request.replyEphemeral(RESPONSES.notAuthorized);
      return;
    }
    if (hasHandledMarker(request.message.reactions)) {
      await request.replyEphemeral(RESPONSES.alreadyFiled);
      return;
    }
    if (!this.rateLimiter.tryAcquire(request.userId)) {
      this.logger.info('denied: rate limited', { userId: request.userId });
      await request.replyEphemeral(RESPONSES.rateLimited);
      return;
    }

    this.pending.set(request.interactionId, {
      userId: request.userId,
      source: toSourceMessage(request.message),
    });
    await request.showModal(
      buildFileIssueModal({
        pendingId: request.interactionId,
        repositories: this.config.repositories,
        defaultRepoKey: this.defaultRepoFor(request),
      }),
    );
  }

  private defaultRepoFor(request: ContextMenuRequest): string | undefined {
    const defaults = this.config.channelDefaults;
    return (
      defaults[request.channelId] ?? (request.parentChannelId ? defaults[request.parentChannelId] : undefined)
    );
  }
}
