import type { BotHandlers } from './discord/bot.js';
import type { AppConfig } from './config/schema.js';
import type { IssueTracker } from './domain/ports.js';
import { createDiscordNotifier } from './discord/notifier.js';
import { CloseNotifier } from './services/close-notifier.js';
import { startInterval } from './util/scheduler.js';
import type { Client } from 'discord.js';
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

export function buildHandlers(config: AppConfig, tracker: IssueTracker, logger: Logger): BotHandlers {
  const pending = new TtlStore<PendingFiling>(PENDING_TTL_MS);
  const limiter = new RateLimiter(config.rateLimit.maxRequests, config.rateLimit.windowSeconds * 1000);
  const service = new FileIssueService(config, tracker);
  const linkService = new LinkIssueService(config, tracker);
  return {
    contextMenu: new ContextMenuHandler(config, pending, limiter, logger, fileIssueModalFactory(config)),
    modalSubmit: new ModalSubmitHandler(service, pending, logger),
    linkContextMenu: new ContextMenuHandler(config, pending, limiter, logger, linkIssueModalFactory()),
    linkModalSubmit: new LinkModalSubmitHandler(linkService, pending, logger),
  };
}

/** Starts the closed-issue poller when `notifications` is configured; returns a function that stops it. */
export function startNotifications(
  config: AppConfig,
  tracker: IssueTracker,
  client: Client,
  logger: Logger,
): () => void {
  if (!config.notifications) return () => undefined;
  const notifier = new CloseNotifier(config, tracker, createDiscordNotifier(client), logger, new Date());
  const intervalMs = config.notifications.pollIntervalMinutes * 60_000;
  logger.info('notifications enabled', { pollIntervalMinutes: config.notifications.pollIntervalMinutes });
  return startInterval(() => notifier.poll(), intervalMs, logger, 'notification poll');
}
