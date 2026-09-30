import type { AppConfig } from '../../config/schema.js';
import type { ModalFactory } from '../handlers/context-menu-handler.js';
import { buildFileIssueModal } from './file-issue-modal.js';
import { buildLinkIssueModal } from './link-issue-modal.js';

export function fileIssueModalFactory(
  config: Pick<AppConfig, 'repositories' | 'channelDefaults'>,
): ModalFactory {
  return (pendingId, request) =>
    buildFileIssueModal({
      pendingId,
      repositories: config.repositories,
      defaultRepoKey:
        config.channelDefaults[request.channelId] ??
        (request.parentChannelId ? config.channelDefaults[request.parentChannelId] : undefined),
    });
}

export function linkIssueModalFactory(): ModalFactory {
  return (pendingId) => buildLinkIssueModal(pendingId);
}
