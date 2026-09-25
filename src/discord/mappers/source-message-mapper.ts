import type { SourceMessage } from '../../domain/source-message.js';

export interface MessageLike {
  readonly id: string;
  readonly cleanContent: string;
  readonly createdAt: Date;
  readonly url: string;
  readonly author: { readonly username: string };
  readonly member: { readonly displayName: string } | null;
  readonly attachments: Iterable<{ readonly name: string; readonly url: string }>;
  readonly guildId: string | null;
  readonly channelId: string;
  readonly channel: {
    readonly name?: string | null;
    readonly isThread: () => boolean;
    readonly parent?: { readonly name: string } | null;
  };
}

export function toSourceMessage(message: MessageLike): SourceMessage {
  const inThread = message.channel.isThread();
  const guild = message.guildId ?? '@me';
  return {
    id: message.id,
    authorName: message.member?.displayName ?? message.author.username,
    content: message.cleanContent,
    timestamp: message.createdAt,
    channelName: (inThread ? message.channel.parent?.name : message.channel.name) ?? 'unknown',
    threadName: inThread ? (message.channel.name ?? null) : null,
    messageUrl: message.url,
    discussionUrl: `https://discord.com/channels/${guild}/${message.channelId}`,
    attachments: [...message.attachments].map((a) => ({ name: a.name, url: a.url })),
  };
}
