import { ApplicationCommandType, ContextMenuCommandBuilder } from 'discord.js';
import { COMMAND_NAME } from '../constants.js';

/** Guild-scoped message context-menu command; the default member permissions do not gate it, the role allowlist does. */
export function fileIssueCommandJson(): ReturnType<ContextMenuCommandBuilder['toJSON']> {
  return new ContextMenuCommandBuilder()
    .setName(COMMAND_NAME)
    .setType(ApplicationCommandType.Message)
    .setContexts(0)
    .toJSON();
}
