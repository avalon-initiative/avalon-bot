import { describe, expect, it, vi } from 'vitest';
import {
  ContextMenuHandler,
  type ContextMenuRequest,
} from '../../../src/discord/handlers/context-menu-handler.js';
import { fileIssueModalFactory, linkIssueModalFactory } from '../../../src/discord/modal/modal-factories.js';
import { RESPONSES } from '../../../src/discord/responses.js';
import type { PendingFiling } from '../../../src/discord/pending.js';
import { RateLimiter } from '../../../src/util/rate-limiter.js';
import { TtlStore } from '../../../src/util/ttl-store.js';
import { GUILD_ID, ROLE_ID, makeConfig, silentLogger } from '../../support/fixtures.js';

function makeRequest(overrides: Partial<ContextMenuRequest> = {}) {
  const replyEphemeral = vi.fn().mockResolvedValue(undefined);
  const showModal = vi.fn().mockResolvedValue(undefined);
  const request: ContextMenuRequest = {
    interactionId: 'i1',
    guildId: GUILD_ID,
    userId: 'u1',
    memberRoleIds: [ROLE_ID],
    channelId: 'c1',
    parentChannelId: null,
    message: {
      id: '3',
      cleanContent: 'hello',
      createdAt: new Date(),
      url: 'https://discord.com/channels/1/2/3',
      author: { username: 'alice' },
      member: null,
      attachments: [],
      guildId: GUILD_ID,
      channelId: 'c1',
      channel: { name: 'sdk', isThread: () => false },
      reactions: [],
    },
    replyEphemeral,
    showModal,
    ...overrides,
  };
  return { request, replyEphemeral, showModal };
}

function setup(config = makeConfig(), limit = 5) {
  const pending = new TtlStore<PendingFiling>(60_000);
  const handler = new ContextMenuHandler(
    config,
    pending,
    new RateLimiter(limit, 60_000),
    silentLogger,
    fileIssueModalFactory(config),
  );
  return { handler, pending };
}

describe('ContextMenuHandler', () => {
  it('opens the modal and remembers the message for an authorized member', async () => {
    const { handler, pending } = setup();
    const { request, showModal } = makeRequest();
    await handler.handle(request);
    expect(showModal).toHaveBeenCalledOnce();
    expect(pending.take('i1')?.source.id).toBe('3');
  });

  it('ignores other guilds silently', async () => {
    const { handler } = setup();
    const { request, showModal, replyEphemeral } = makeRequest({ guildId: '999' });
    await handler.handle(request);
    expect(showModal).not.toHaveBeenCalled();
    expect(replyEphemeral).not.toHaveBeenCalled();
  });

  it('refuses members without an allowed role', async () => {
    const { handler } = setup();
    const { request, showModal, replyEphemeral } = makeRequest({ memberRoleIds: ['other'] });
    await handler.handle(request);
    expect(showModal).not.toHaveBeenCalled();
    expect(replyEphemeral).toHaveBeenCalledWith(RESPONSES.notAuthorized);
  });

  it('refuses messages the bot already handled', async () => {
    const { handler } = setup();
    const base = makeRequest();
    const { request, showModal, replyEphemeral } = makeRequest({
      message: { ...base.request.message, reactions: [{ emoji: { name: '✅' }, me: true }] },
    });
    await handler.handle(request);
    expect(showModal).not.toHaveBeenCalled();
    expect(replyEphemeral).toHaveBeenCalledWith(RESPONSES.alreadyFiled);
  });

  it('rate limits per user', async () => {
    const { handler } = setup(makeConfig(), 1);
    await handler.handle(makeRequest().request);
    const second = makeRequest({ interactionId: 'i2' });
    await handler.handle(second.request);
    expect(second.replyEphemeral).toHaveBeenCalledWith(RESPONSES.rateLimited);
  });

  it('does not spend rate limit on denied requests', async () => {
    const { handler } = setup(makeConfig(), 1);
    await handler.handle(makeRequest({ memberRoleIds: [] }).request);
    const allowed = makeRequest();
    await handler.handle(allowed.request);
    expect(allowed.showModal).toHaveBeenCalledOnce();
  });

  it('preselects the channel default, falling back to the thread parent', async () => {
    const { handler } = setup(makeConfig({ channelDefaults: { p1: 'hub' } }));
    const { request, showModal } = makeRequest({ channelId: 'thread1', parentChannelId: 'p1' });
    await handler.handle(request);
    const modal = JSON.stringify((showModal.mock.calls[0]?.[0] as { toJSON(): unknown }).toJSON());
    expect(modal).toMatch(/"value":"hub"[^}]*"default":true/);
  });

  it('opens whichever modal its factory builds, behind the same gates', async () => {
    const pending = new TtlStore<PendingFiling>(60_000);
    const handler = new ContextMenuHandler(
      makeConfig(),
      pending,
      new RateLimiter(5, 60_000),
      silentLogger,
      linkIssueModalFactory(makeConfig()),
    );
    const denied = makeRequest({ memberRoleIds: [] });
    await handler.handle(denied.request);
    expect(denied.replyEphemeral).toHaveBeenCalledWith(RESPONSES.notAuthorized);

    const allowed = makeRequest();
    await handler.handle(allowed.request);
    const modal = allowed.showModal.mock.calls[0]?.[0] as { toJSON(): { custom_id: string } };
    expect(modal.toJSON().custom_id).toBe('link-issue:i1');
  });
});
