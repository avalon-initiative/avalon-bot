import type { RepositoryConfig } from '../config/schema.js';
import type { IssueReference } from './issue-reference.js';

const KEYWORD = String.raw`(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)`;
const TARGET = String.raw`(?:https://github\.com/([\w.-]+/[\w.-]+)/issues/(\d+)|([\w.-]+/[\w.-]+)?#(\d+))`;
const CLOSING = new RegExp(String.raw`\b${KEYWORD}:?\s+${TARGET}`, 'gi');

/**
 * Issues a pull request body closes through `Closes #N`, `Fixes owner/repo#N` or an issue URL.
 * Only configured repositories resolve, and HTML comments are ignored.
 */
export function extractClosingReferences(
  body: string,
  pullRequestRepo: string,
  repositories: readonly RepositoryConfig[],
): IssueReference[] {
  const text = body.replace(/<!--[\s\S]*?-->/g, '');
  const found = new Map<string, IssueReference>();
  for (const match of text.matchAll(CLOSING)) {
    const target = match[1] ?? match[3] ?? pullRequestRepo;
    const number = Number(match[2] ?? match[4]);
    const repository = repositories.find((r) => r.repo.toLowerCase() === target.toLowerCase());
    if (!repository || !Number.isSafeInteger(number)) continue;
    found.set(`${repository.repo}#${String(number)}`, { repo: repository.repo, number });
  }
  return [...found.values()];
}
