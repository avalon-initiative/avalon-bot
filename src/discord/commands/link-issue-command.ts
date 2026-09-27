import { ApplicationCommandType, ContextMenuCommandBuilder } from 'discord.js';
import { LINK_COMMAND_NAME } from '../constants.js';

/** Guild-scoped message context-menu command; gated by the role allowlist like the filing command. */
export function linkIssueCommandJson(): ReturnType<ContextMenuCommandBuilder['toJSON']> {
  return new ContextMenuCommandBuilder()
    .setName(LINK_COMMAND_NAME)
    .setType(ApplicationCommandType.Message)
    .setContexts(0)
    .toJSON();
}
