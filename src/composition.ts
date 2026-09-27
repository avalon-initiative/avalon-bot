import type { BotHandlers } from './discord/bot.js';
import type { AppConfig } from './config/schema.js';
import type { GitHubAppClient } from './github/app-client.js';
import { OctokitIssueTracker } from './github/octokit-issue-tracker.js';
import { PENDING_TTL_MS } from './discord/constants.js';
import { ContextMenuHandler } from './discord/handlers/context-menu-handler.js';
import { LinkModalSubmitHandler } from './discord/handlers/link-modal-submit-handler.js';
import { fileIssueModalFactory, linkIssueModalFactory } from './discord/modal/modal-factories.js';
import { ModalSubmitHandler } from './discord/handlers/modal-submit-handler.js';
import type { PendingFiling } from './discord/pending.js';
import { FileIssueService } from './services/file-issue-service.js';
import { LinkIssueService } from './services/link-issue-service.js';
import type { Logger } from './util/logger.js';
import { RateLimiter } from './util/rate-limiter.js';
import { TtlStore } from './util/ttl-store.js';

export function buildHandlers(config: AppConfig, github: GitHubAppClient, logger: Logger): BotHandlers {
  const pending = new TtlStore<PendingFiling>(PENDING_TTL_MS);
  const limiter = new RateLimiter(config.rateLimit.maxRequests, config.rateLimit.windowSeconds * 1000);
  const tracker = new OctokitIssueTracker(github);
  const service = new FileIssueService(config, tracker);
  const linkService = new LinkIssueService(config, tracker);
  return {
    contextMenu: new ContextMenuHandler(config, pending, limiter, logger, fileIssueModalFactory(config)),
    modalSubmit: new ModalSubmitHandler(service, pending, logger),
    linkContextMenu: new ContextMenuHandler(config, pending, limiter, logger, linkIssueModalFactory()),
    linkModalSubmit: new LinkModalSubmitHandler(linkService, pending, logger),
  };
}
