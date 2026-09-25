import { describe, expect, it } from 'vitest';
import { toSourceMessage, type MessageLike } from '../../../src/discord/mappers/source-message-mapper.js';

function message(overrides: Partial<MessageLike> = {}): MessageLike {
  return {
    id: '3',
    cleanContent: 'hello',
    createdAt: new Date('2026-09-25T00:00:00Z'),
    url: 'https://discord.com/channels/1/2/3',
    author: { username: 'alice' },
    member: { displayName: 'Alice' },
    attachments: [{ name: 'a.png', url: 'https://cdn/a.png' }],
    guildId: '1',
    channelId: '2',
    channel: { name: 'sdk', isThread: () => false },
    ...overrides,
  };
}

describe('toSourceMessage', () => {
  it('maps a channel message', () => {
    expect(toSourceMessage(message())).toEqual({
      id: '3',
      authorName: 'Alice',
      content: 'hello',
      timestamp: new Date('2026-09-25T00:00:00Z'),
      channelName: 'sdk',
      threadName: null,
      messageUrl: 'https://discord.com/channels/1/2/3',
      discussionUrl: 'https://discord.com/channels/1/2',
      attachments: [{ name: 'a.png', url: 'https://cdn/a.png' }],
    });
  });

  it('falls back to the username when there is no member', () => {
    expect(toSourceMessage(message({ member: null })).authorName).toBe('alice');
  });

  it('reports the parent channel and thread name for thread messages', () => {
    const source = toSourceMessage(
      message({ channel: { name: 'reconnect', isThread: () => true, parent: { name: 'sdk' } } }),
    );
    expect(source.channelName).toBe('sdk');
    expect(source.threadName).toBe('reconnect');
  });
});
