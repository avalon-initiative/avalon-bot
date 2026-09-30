import type { AppConfig } from '../../src/config/schema.js';
import type { FileIssueRequest } from '../../src/domain/issue.js';
import type { SourceMessage } from '../../src/domain/source-message.js';

export const GUILD_ID = '111111111111111111';
export const ROLE_ID = '222222222222222222';

export function makeSource(overrides: Partial<SourceMessage> = {}): SourceMessage {
  return {
    id: '333333333333333333',
    authorName: 'Alice',
    content: "The SDK reconnects, but it doesn't restore guild state.",
    timestamp: new Date('2026-09-25T12:00:00.000Z'),
    channelName: 'sdk',
    threadName: null,
    messageUrl: 'https://discord.com/channels/1/2/3',
    discussionUrl: 'https://discord.com/channels/1/2',
    attachments: [],
    ...overrides,
  };
}

export function makeRequest(overrides: Partial<FileIssueRequest> = {}): FileIssueRequest {
  return {
    kind: 'bug',
    repoKey: 'sdks',
    title: 'SDK reconnect loses guild state',
    notes: 'Happens after a network drop.',
    source: makeSource(),
    filedBy: 'Bob',
    ...overrides,
  };
}

export function makeConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    guildId: GUILD_ID,
    allowedRoleIds: [ROLE_ID],
    repositories: [
      { key: 'sdks', name: 'Avalon SDKs', repo: 'avalon-initiative/avalon-sdks' },
      { key: 'hub', name: 'Avalon Hub', repo: 'avalon-initiative/avalon-hub' },
    ],
    channelDefaults: {},
    labels: {
      bug: 'type: bug',
      feature: 'type: feature',
      task: 'type: chore',
      decision: 'decision',
      adr: 'architecture-decision-record',
    },
    maintainerRoleIds: [],
    commentOnLinkedIssue: true,
    rateLimit: { maxRequests: 5, windowSeconds: 600 },
    ...overrides,
  };
}

export const silentLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};
