import type { AppConfig } from '../../config/schema.js';
import {
  AlreadyPromotedError,
  IssueNotFoundError,
  NotADecisionError,
  RepositoryNotAccessibleError,
  UnknownRepositoryError,
} from '../../domain/errors.js';
import type { PromoteDecisionService } from '../../services/promote-decision-service.js';
import type { Logger } from '../../util/logger.js';
import { isAuthorized } from '../permissions.js';
import { parsePromoteCustomId } from '../promote-button.js';
import { RESPONSES } from '../responses.js';

export interface PromoteRequest {
  readonly customId: string;
  readonly guildId: string | null;
  readonly userId: string;
  readonly userName: string;
  readonly memberRoleIds: readonly string[];
  deferEphemeral(): Promise<void>;
  editReply(content: string): Promise<void>;
  /** Removes the button from the message that carried it. */
  removeButton(): Promise<void>;
}

export class PromoteAdrHandler {
  constructor(
    private readonly config: Pick<AppConfig, 'guildId' | 'maintainerRoleIds'>,
    private readonly service: PromoteDecisionService,
    private readonly logger: Logger,
  ) {}

  async handle(request: PromoteRequest): Promise<void> {
    if (request.guildId !== this.config.guildId) return;
    await request.deferEphemeral();

    if (!isAuthorized(request.memberRoleIds, this.config.maintainerRoleIds)) {
      this.logger.info('denied: not a maintainer', { userId: request.userId });
      await request.editReply(RESPONSES.promoteNotAuthorized);
      return;
    }
    const target = parsePromoteCustomId(request.customId);
    if (!target) {
      await request.editReply(RESPONSES.invalidForm);
      return;
    }

    try {
      const issue = await this.service.promote({ ...target, promotedBy: request.userName });
      await this.removeButtonQuietly(request);
      await request.editReply(RESPONSES.promoted);
      this.logger.info('decision promoted', {
        repo: issue.repo,
        number: issue.number,
        userId: request.userId,
      });
    } catch (error) {
      if (error instanceof AlreadyPromotedError) await this.removeButtonQuietly(request);
      await request.editReply(this.messageFor(error));
    }
  }

  private async removeButtonQuietly(request: PromoteRequest): Promise<void> {
    try {
      await request.removeButton();
    } catch (error) {
      this.logger.warn('could not remove promote button', { error: String(error) });
    }
  }

  private messageFor(error: unknown): string {
    if (error instanceof AlreadyPromotedError) return RESPONSES.alreadyPromoted;
    if (error instanceof NotADecisionError) return RESPONSES.notADecision;
    if (error instanceof IssueNotFoundError) return RESPONSES.issueNotFound;
    if (error instanceof RepositoryNotAccessibleError) return RESPONSES.repoNotAccessible;
    if (error instanceof UnknownRepositoryError) return RESPONSES.invalidForm;
    this.logger.error('promotion failed', { error: String(error) });
    return RESPONSES.unexpectedPromote;
  }
}
