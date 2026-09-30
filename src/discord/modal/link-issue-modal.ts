import { LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { LINK_FIELD, LINK_MODAL_ID_PREFIX } from '../constants.js';

export function buildLinkIssueModal(pendingId: string): ModalBuilder {
  const issue = new TextInputBuilder()
    .setCustomId(LINK_FIELD.issue)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('https://github.com/owner/repo/issues/12 or sdks#12')
    .setMaxLength(200)
    .setRequired(true);

  return new ModalBuilder()
    .setCustomId(`${LINK_MODAL_ID_PREFIX}${pendingId}`)
    .setTitle('Link GitHub Issue')
    .addLabelComponents(new LabelBuilder().setLabel('Issue URL or repo#number').setTextInputComponent(issue));
}

export interface LinkModalFields {
  getTextInputValue(customId: string): string;
}

export function parseLinkSubmission(fields: LinkModalFields): string {
  return fields.getTextInputValue(LINK_FIELD.issue).trim();
}

export function linkPendingIdFrom(customId: string): string | undefined {
  return customId.startsWith(LINK_MODAL_ID_PREFIX) ? customId.slice(LINK_MODAL_ID_PREFIX.length) : undefined;
}
