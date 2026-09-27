import type { AppConfig } from '../config/schema.js';
import type { NoteTarget } from '../domain/ports.js';
import { parseDiscordOrigin } from '../render/issue-body.js';

/**
 * Where to post a note about an issue: the source message recorded in a bot-authored issue body,
 * within the configured guild and outside muted channels. Undefined means "not ours, stay quiet".
 */
export function resolveNoteTarget(
  config: Pick<AppConfig, 'guildId' | 'notifications'>,
  issue: { readonly body: string; readonly authoredByBot: boolean },
): NoteTarget | undefined {
  if (!issue.authoredByBot) return undefined;
  const origin = parseDiscordOrigin(issue.body);
  if (origin?.guildId !== config.guildId) return undefined;
  if (config.notifications?.mutedChannelIds.includes(origin.channelId)) return undefined;
  return { channelId: origin.channelId, messageId: origin.messageId };
}
