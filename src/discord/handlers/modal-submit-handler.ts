import {
  InvalidTitleError,
  RepositoryNotAccessibleError,
  UnknownRepositoryError,
} from '../../domain/errors.js';
import type { FileIssueService } from '../../services/file-issue-service.js';
import type { Logger } from '../../util/logger.js';
import { parseModalSubmission, pendingIdFrom, type ModalFields } from '../modal/file-issue-modal.js';
import type { PendingStore } from '../pending.js';
import { RESPONSES, issueCreatedMessage } from '../responses.js';

export interface ModalSubmitRequest {
  readonly customId: string;
  readonly userId: string;
  readonly userName: string;
  readonly fields: ModalFields;
  deferEphemeral(): Promise<void>;
  editReply(content: string): Promise<void>;
  /** Posts publicly as a reply to the source message. */
  replyToMessage(messageId: string, content: string): Promise<void>;
  markHandled(messageId: string): Promise<void>;
}

export class ModalSubmitHandler {
  constructor(
    private readonly service: FileIssueService,
    private readonly pending: PendingStore,
    private readonly logger: Logger,
  ) {}

  async handle(request: ModalSubmitRequest): Promise<void> {
    await request.deferEphemeral();

    const pendingId = pendingIdFrom(request.customId);
    const filing = pendingId === undefined ? undefined : this.pending.take(pendingId);
    if (filing?.userId !== request.userId) {
      await request.editReply(RESPONSES.expired);
      return;
    }
    const submission = parseModalSubmission(request.fields);
    if (!submission) {
      await request.editReply(RESPONSES.invalidForm);
      return;
    }

    try {
      const issue = await this.service.file({
        ...submission,
        source: filing.source,
        filedBy: request.userName,
      });
      await this.markHandledQuietly(request, filing.source.id);
      await request.replyToMessage(filing.source.id, issueCreatedMessage(issue));
      await request.editReply(RESPONSES.done);
      this.logger.info('issue filed', { repo: issue.repo, number: issue.number, userId: request.userId });
    } catch (error) {
      await request.editReply(this.messageFor(error));
    }
  }

  private async markHandledQuietly(request: ModalSubmitRequest, messageId: string): Promise<void> {
    try {
      await request.markHandled(messageId);
    } catch (error) {
      this.logger.warn('could not add handled marker', { error: String(error) });
    }
  }

  private messageFor(error: unknown): string {
    if (error instanceof InvalidTitleError) return RESPONSES.emptyTitle;
    if (error instanceof RepositoryNotAccessibleError) return RESPONSES.repoNotAccessible;
    if (error instanceof UnknownRepositoryError) return RESPONSES.invalidForm;
    this.logger.error('filing failed', { error: String(error) });
    return RESPONSES.unexpected;
  }
}
