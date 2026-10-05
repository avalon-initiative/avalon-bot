import {
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import type { RepositoryConfig } from '../../config/schema.js';
import { LINK_FIELD, LINK_MODAL_ID_PREFIX } from '../constants.js';

export interface LinkModalOptions {
  readonly pendingId: string;
  readonly repositories: readonly RepositoryConfig[];
  readonly defaultRepoKey: string | undefined;
}

export function buildLinkIssueModal(options: LinkModalOptions): ModalBuilder {
  const repoSelect = new StringSelectMenuBuilder()
    .setCustomId(LINK_FIELD.repo)
    .setPlaceholder('Choose a repository')
    .addOptions(
      options.repositories.map((repo) =>
        new StringSelectMenuOptionBuilder()
          .setValue(repo.key)
          .setLabel(repo.name)
          .setDefault(repo.key === options.defaultRepoKey),
      ),
    );

  const number = new TextInputBuilder()
    .setCustomId(LINK_FIELD.number)
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('12')
    .setMaxLength(9)
    .setRequired(true);

  return new ModalBuilder()
    .setCustomId(`${LINK_MODAL_ID_PREFIX}${options.pendingId}`)
    .setTitle('Link GitHub Issue')
    .addLabelComponents(
      new LabelBuilder().setLabel('Repository').setStringSelectMenuComponent(repoSelect),
      new LabelBuilder().setLabel('Issue number').setTextInputComponent(number),
    );
}

export interface LinkModalFields {
  getTextInputValue(customId: string): string;
  getStringSelectValues(customId: string): readonly string[];
}

/** Returns a `key#number` reference; a malformed number is left for the reference parser to reject. */
export function parseLinkSubmission(fields: LinkModalFields): string {
  const [repoKey = ''] = fields.getStringSelectValues(LINK_FIELD.repo);
  const number = fields.getTextInputValue(LINK_FIELD.number).trim().replace(/^#/, '');
  return `${repoKey}#${number}`;
}

export function linkPendingIdFrom(customId: string): string | undefined {
  return customId.startsWith(LINK_MODAL_ID_PREFIX) ? customId.slice(LINK_MODAL_ID_PREFIX.length) : undefined;
}
