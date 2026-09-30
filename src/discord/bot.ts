import { Client, Events, GatewayIntentBits, type Interaction } from 'discord.js';
import type { Logger } from '../util/logger.js';
import { toContextMenuRequest, toModalSubmitRequest, toPromoteRequest } from './adapters.js';
import { COMMAND_NAME, LINK_COMMAND_NAME, LINK_MODAL_ID_PREFIX, MODAL_ID_PREFIX } from './constants.js';
import type { ContextMenuHandler } from './handlers/context-menu-handler.js';
import type { LinkModalSubmitHandler } from './handlers/link-modal-submit-handler.js';
import type { PromoteAdrHandler } from './handlers/promote-adr-handler.js';
import { isPromoteCustomId } from './promote-button.js';
import type { ModalSubmitHandler } from './handlers/modal-submit-handler.js';

export interface BotHandlers {
  readonly contextMenu: ContextMenuHandler;
  readonly modalSubmit: ModalSubmitHandler;
  readonly linkContextMenu: ContextMenuHandler;
  readonly linkModalSubmit: LinkModalSubmitHandler;
  readonly promoteAdr: PromoteAdrHandler;
}

export async function startBot(token: string, handlers: BotHandlers, logger: Logger): Promise<Client> {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.on(Events.InteractionCreate, (interaction) => {
    route(interaction, handlers).catch((error: unknown) => {
      logger.error('interaction failed', { error: String(error) });
    });
  });
  client.once(Events.ClientReady, (ready) => {
    logger.info('bot ready', { user: ready.user.tag });
  });

  await client.login(token);
  return client;
}

async function route(interaction: Interaction, handlers: BotHandlers): Promise<void> {
  if (interaction.isMessageContextMenuCommand() && interaction.commandName === COMMAND_NAME) {
    await handlers.contextMenu.handle(toContextMenuRequest(interaction));
  } else if (interaction.isMessageContextMenuCommand() && interaction.commandName === LINK_COMMAND_NAME) {
    await handlers.linkContextMenu.handle(toContextMenuRequest(interaction));
  } else if (interaction.isModalSubmit() && interaction.customId.startsWith(MODAL_ID_PREFIX)) {
    await handlers.modalSubmit.handle(toModalSubmitRequest(interaction));
  } else if (interaction.isModalSubmit() && interaction.customId.startsWith(LINK_MODAL_ID_PREFIX)) {
    await handlers.linkModalSubmit.handle(toModalSubmitRequest(interaction));
  } else if (interaction.isButton() && isPromoteCustomId(interaction.customId)) {
    await handlers.promoteAdr.handle(toPromoteRequest(interaction));
  }
}
