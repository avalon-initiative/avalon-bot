import type { AppConfig } from '../../config/schema.js';
import type { ContextMenuRequest, ModalFactory } from '../handlers/context-menu-handler.js';
import { buildFileIssueModal } from './file-issue-modal.js';
import { buildLinkIssueModal } from './link-issue-modal.js';

type ModalConfig = Pick<AppConfig, 'repositories' | 'channelDefaults'>;

function defaultRepoKey(config: ModalConfig, request: ContextMenuRequest): string | undefined {
  return (
    config.channelDefaults[request.channelId] ??
    (request.parentChannelId ? config.channelDefaults[request.parentChannelId] : undefined)
  );
}

export function fileIssueModalFactory(config: ModalConfig): ModalFactory {
  return (pendingId, request) =>
    buildFileIssueModal({
      pendingId,
      repositories: config.repositories,
      defaultRepoKey: defaultRepoKey(config, request),
    });
}

export function linkIssueModalFactory(config: ModalConfig): ModalFactory {
  return (pendingId, request) =>
    buildLinkIssueModal({
      pendingId,
      repositories: config.repositories,
      defaultRepoKey: defaultRepoKey(config, request),
    });
}
