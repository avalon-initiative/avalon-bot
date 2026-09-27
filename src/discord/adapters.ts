import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type ButtonInteraction,
  type MessageContextMenuCommandInteraction,
  type ModalSubmitInteraction,
} from 'discord.js';
import { HANDLED_EMOJI } from './constants.js';
import type { ContextMenuRequest } from './handlers/context-menu-handler.js';
import type { PromoteRequest } from './handlers/promote-adr-handler.js';
import type { ModalSubmitRequest } from './handlers/modal-submit-handler.js';

/** Adapts discord.js interactions to the library-free requests the handlers consume. */
export function toContextMenuRequest(interaction: MessageContextMenuCommandInteraction): ContextMenuRequest {
  const roles = interaction.member?.roles;
  const channel = interaction.channel;
  return {
    interactionId: interaction.id,
    guildId: interaction.guildId,
    userId: interaction.user.id,
    memberRoleIds: Array.isArray(roles) ? roles : roles ? [...roles.cache.keys()] : [],
    channelId: interaction.channelId,
    parentChannelId: channel?.isThread() ? channel.parentId : null,
    message: {
      id: interaction.targetMessage.id,
      cleanContent: interaction.targetMessage.cleanContent,
      createdAt: interaction.targetMessage.createdAt,
      url: interaction.targetMessage.url,
      author: interaction.targetMessage.author,
      member: interaction.targetMessage.member,
      attachments: interaction.targetMessage.attachments.values(),
      guildId: interaction.targetMessage.guildId,
      channelId: interaction.targetMessage.channelId,
      channel: interaction.targetMessage.channel,
      reactions: interaction.targetMessage.reactions.cache.values(),
    },
    replyEphemeral: async (content) => {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    },
    showModal: async (modal) => {
      await interaction.showModal(modal);
    },
  };
}

export function toModalSubmitRequest(interaction: ModalSubmitInteraction): ModalSubmitRequest {
  return {
    customId: interaction.customId,
    userId: interaction.user.id,
    userName:
      interaction.member && 'displayName' in interaction.member
        ? interaction.member.displayName
        : interaction.user.username,
    fields: interaction.fields,
    deferEphemeral: async () => {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    },
    editReply: async (content) => {
      await interaction.editReply({ content });
    },
    replyToMessage: async (messageId, content, button) => {
      const channel = interaction.channel;
      if (!channel?.isSendable()) return;
      await channel.send({
        content,
        components: button
          ? [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setCustomId(button.customId)
                  .setLabel(button.label)
                  .setStyle(ButtonStyle.Secondary),
              ),
            ]
          : [],
        reply: { messageReference: messageId, failIfNotExists: false },
        allowedMentions: { parse: [], repliedUser: false },
      });
    },
    markHandled: async (messageId) => {
      const channel = interaction.channel;
      if (!channel?.isTextBased()) return;
      await channel.messages.react(messageId, HANDLED_EMOJI);
    },
  };
}

export function toPromoteRequest(interaction: ButtonInteraction): PromoteRequest {
  const roles = interaction.member?.roles;
  return {
    customId: interaction.customId,
    guildId: interaction.guildId,
    userId: interaction.user.id,
    userName:
      interaction.member && 'displayName' in interaction.member
        ? interaction.member.displayName
        : interaction.user.username,
    memberRoleIds: Array.isArray(roles) ? roles : roles ? [...roles.cache.keys()] : [],
    deferEphemeral: async () => {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    },
    editReply: async (content) => {
      await interaction.editReply({ content });
    },
    removeButton: async () => {
      await interaction.message.edit({ components: [] });
    },
  };
}
