import type { BotHandlers } from './discord/bot.js';
import type { AppConfig } from './config/schema.js';
import type { GitHubAppClient } from './github/app-client.js';
import { OctokitIssueTracker } from './github/octokit-issue-tracker.js';
import { PENDING_TTL_MS } from './discord/constants.js';
import { ContextMenuHandler } from './discord/handlers/context-menu-handler.js';
import { ModalSubmitHandler } from './discord/handlers/modal-submit-handler.js';
import type { PendingFiling } from './discord/pending.js';
import { FileIssueService } from './services/file-issue-service.js';
import type { Logger } from './util/logger.js';
import { RateLimiter } from './util/rate-limiter.js';
import { TtlStore } from './util/ttl-store.js';

export function buildHandlers(config: AppConfig, github: GitHubAppClient, logger: Logger): BotHandlers {
  const pending = new TtlStore<PendingFiling>(PENDING_TTL_MS);
  const limiter = new RateLimiter(config.rateLimit.maxRequests, config.rateLimit.windowSeconds * 1000);
  const service = new FileIssueService(config, new OctokitIssueTracker(github));
  return {
    contextMenu: new ContextMenuHandler(config, pending, limiter, logger),
    modalSubmit: new ModalSubmitHandler(service, pending, logger),
  };
}
