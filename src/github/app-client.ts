import { readFile } from 'node:fs/promises';
import { App } from '@octokit/app';
import type { Env } from '../config/env.js';

export interface GitHubRequester {
  request(route: string, parameters: Record<string, unknown>): Promise<{ data: unknown }>;
}

/** Authenticates as the GitHub App and hands out per-installation clients. */
export interface GitHubAppClient {
  installationIdFor(owner: string, repo: string): Promise<number>;
  clientFor(installationId: number): Promise<GitHubRequester>;
}

export async function createGitHubAppClient(env: Env): Promise<GitHubAppClient> {
  const app = new App({
    appId: env.GITHUB_APP_ID,
    privateKey: await readFile(env.GITHUB_APP_PRIVATE_KEY_PATH, 'utf8'),
  });
  return {
    async installationIdFor(owner, repo) {
      const { data } = await app.octokit.request('GET /repos/{owner}/{repo}/installation', { owner, repo });
      return data.id;
    },
    async clientFor(installationId) {
      return app.getInstallationOctokit(installationId);
    },
  };
}
