import {
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import type { RepositoryConfig } from '../../config/schema.js';
import { ISSUE_KINDS, ISSUE_KIND_INFO, isIssueKind, type IssueKind } from '../../domain/issue-kind.js';
import { MAX_TITLE_LENGTH } from '../../render/issue-body.js';
import { FIELD, MODAL_ID_PREFIX } from '../constants.js';

const PUBLIC_WARNING = 'Issues are filed in public repositories. The selected message will be quoted in it.';

export interface ModalOptions {
  readonly pendingId: string;
  readonly repositories: readonly RepositoryConfig[];
  readonly defaultRepoKey: string | undefined;
}

export function buildFileIssueModal(options: ModalOptions): ModalBuilder {
  const kindSelect = new StringSelectMenuBuilder()
    .setCustomId(FIELD.kind)
    .setPlaceholder('Choose a type')
    .addOptions(
      ISSUE_KINDS.map((kind) =>
        new StringSelectMenuOptionBuilder()
          .setValue(kind)
          .setLabel(ISSUE_KIND_INFO[kind].displayName)
          .setEmoji({ name: ISSUE_KIND_INFO[kind].emoji }),
      ),
    );

  const repoSelect = new StringSelectMenuBuilder()
    .setCustomId(FIELD.repo)
    .setPlaceholder('Choose a repository')
    .addOptions(
      options.repositories.map((repo) =>
        new StringSelectMenuOptionBuilder()
          .setValue(repo.key)
          .setLabel(repo.name)
          .setDefault(repo.key === options.defaultRepoKey),
      ),
    );

  const title = new TextInputBuilder()
    .setCustomId(FIELD.title)
    .setStyle(TextInputStyle.Short)
    .setMaxLength(MAX_TITLE_LENGTH)
    .setRequired(true);

  const notes = new TextInputBuilder()
    .setCustomId(FIELD.notes)
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(2000)
    .setRequired(false);

  return new ModalBuilder()
    .setCustomId(`${MODAL_ID_PREFIX}${options.pendingId}`)
    .setTitle('Create GitHub Issue')
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(PUBLIC_WARNING))
    .addLabelComponents(
      new LabelBuilder().setLabel('Type').setStringSelectMenuComponent(kindSelect),
      new LabelBuilder().setLabel('Repository').setStringSelectMenuComponent(repoSelect),
      new LabelBuilder().setLabel('Title').setTextInputComponent(title),
      new LabelBuilder().setLabel('Additional details').setTextInputComponent(notes),
    );
}

export interface ModalFields {
  getTextInputValue(customId: string): string;
  getStringSelectValues(customId: string): readonly string[];
}

export interface ModalSubmission {
  readonly kind: IssueKind;
  readonly repoKey: string;
  readonly title: string;
  readonly notes: string;
}

export function parseModalSubmission(fields: ModalFields): ModalSubmission | undefined {
  const [kind] = fields.getStringSelectValues(FIELD.kind);
  const [repoKey] = fields.getStringSelectValues(FIELD.repo);
  if (kind === undefined || !isIssueKind(kind) || repoKey === undefined) return undefined;
  return {
    kind,
    repoKey,
    title: fields.getTextInputValue(FIELD.title),
    notes: fields.getTextInputValue(FIELD.notes),
  };
}

export function pendingIdFrom(customId: string): string | undefined {
  return customId.startsWith(MODAL_ID_PREFIX) ? customId.slice(MODAL_ID_PREFIX.length) : undefined;
}
