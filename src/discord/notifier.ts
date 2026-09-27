import type { Client } from 'discord.js';
import type { DiscordNotifier, NoteTarget } from '../domain/ports.js';

export function createDiscordNotifier(client: Client): DiscordNotifier {
  return {
    async postNote(target: NoteTarget, content: string): Promise<void> {
      const channel = await client.channels.fetch(target.channelId);
      if (!channel?.isSendable()) return;
      await channel.send({
        content,
        reply: { messageReference: target.messageId, failIfNotExists: false },
        allowedMentions: { parse: [], repliedUser: false },
      });
    },
  };
}
