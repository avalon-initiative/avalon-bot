import { parseEnv } from './config/env.js';
import { loadConfig } from './config/load.js';
import { buildHandlers, startNotifications } from './composition.js';
import { startBot } from './discord/bot.js';
import { createGitHubAppClient } from './github/app-client.js';
import { OctokitIssueTracker } from './github/octokit-issue-tracker.js';
import { createLogger } from './util/logger.js';

const env = parseEnv(process.env);
const logger = createLogger(env.LOG_LEVEL);
const config = await loadConfig(env.CONFIG_PATH);
const github = await createGitHubAppClient(env);

const tracker = new OctokitIssueTracker(github);

const client = await startBot(env.DISCORD_TOKEN, buildHandlers(config, tracker, logger), logger);
const stopNotifications = startNotifications(config, tracker, client, logger);

const shutdown = (): void => {
  logger.info('shutting down');
  stopNotifications();
  void client.destroy().then(() => {
    process.exit(0);
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
