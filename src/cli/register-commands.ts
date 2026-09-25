import { REST, Routes } from 'discord.js';
import { parseEnv } from '../config/env.js';
import { loadConfig } from '../config/load.js';
import { fileIssueCommandJson } from '../discord/commands/file-issue-command.js';

const env = parseEnv(process.env);
const config = await loadConfig(env.CONFIG_PATH);
const rest = new REST().setToken(env.DISCORD_TOKEN);

await rest.put(Routes.applicationGuildCommands(env.DISCORD_APP_ID, config.guildId), {
  body: [fileIssueCommandJson()],
});
process.stdout.write('Registered guild commands.\n');
