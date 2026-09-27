import {
  InvalidIssueReferenceError,
  IssueNotFoundError,
  RepositoryNotAccessibleError,
} from '../../domain/errors.js';
import type { LinkIssueService } from '../../services/link-issue-service.js';
import type { Logger } from '../../util/logger.js';
import { linkPendingIdFrom, parseLinkSubmission, type LinkModalFields } from '../modal/link-issue-modal.js';
import type { PendingStore } from '../pending.js';
import { RESPONSES, issueLinkedMessage } from '../responses.js';
import type { ModalSubmitRequest } from './modal-submit-handler.js';

export type LinkSubmitRequest = Omit<ModalSubmitRequest, 'fields'> & { readonly fields: LinkModalFields };

export class LinkModalSubmitHandler {
  constructor(
    private readonly service: LinkIssueService,
    private readonly pending: PendingStore,
    private readonly logger: Logger,
  ) {}

  async handle(request: LinkSubmitRequest): Promise<void> {
    await request.deferEphemeral();

    const pendingId = linkPendingIdFrom(request.customId);
    const linking = pendingId === undefined ? undefined : this.pending.take(pendingId);
    if (linking?.userId !== request.userId) {
      await request.editReply(RESPONSES.expired);
      return;
    }

    try {
      const { issue, commented } = await this.service.link({
        reference: parseLinkSubmission(request.fields),
        source: linking.source,
        linkedBy: request.userName,
      });
      await this.markHandledQuietly(request, linking.source.id);
      await request.replyToMessage(linking.source.id, issueLinkedMessage(issue));
      await request.editReply(RESPONSES.linked);
      this.logger.info('issue linked', {
        repo: issue.repo,
        number: issue.number,
        commented,
        userId: request.userId,
      });
    } catch (error) {
      await request.editReply(this.messageFor(error));
    }
  }

  private async markHandledQuietly(request: LinkSubmitRequest, messageId: string): Promise<void> {
    try {
      await request.markHandled(messageId);
    } catch (error) {
      this.logger.warn('could not add handled marker', { error: String(error) });
    }
  }

  private messageFor(error: unknown): string {
    if (error instanceof InvalidIssueReferenceError) return RESPONSES.invalidReference;
    if (error instanceof IssueNotFoundError) return RESPONSES.issueNotFound;
    if (error instanceof RepositoryNotAccessibleError) return RESPONSES.repoNotAccessible;
    this.logger.error('linking failed', { error: String(error) });
    return RESPONSES.unexpectedLink;
  }
}
