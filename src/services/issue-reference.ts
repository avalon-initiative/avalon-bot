import type { RepositoryConfig } from '../config/schema.js';
import { InvalidIssueReferenceError } from '../domain/errors.js';

export interface IssueReference {
  readonly repo: string;
  readonly number: number;
}

const URL_PATTERN = /^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/(?:issues|pull)\/(\d+)(?:[/?#].*)?$/i;
const SHORT_PATTERN = /^([\w.-]+(?:\/[\w.-]+)?)#(\d+)$/;

/**
 * Accepts an issue URL, `owner/name#N`, or `key#N` using a configured repository key.
 * Only repositories from the config resolve; anything else is rejected.
 */
export function parseIssueReference(
  input: string,
  repositories: readonly RepositoryConfig[],
): IssueReference {
  const text = input.trim();
  const match = URL_PATTERN.exec(text) ?? SHORT_PATTERN.exec(text);
  const [, target, digits] = match ?? [];
  if (target === undefined || digits === undefined) throw new InvalidIssueReferenceError(text);

  const repository = repositories.find(
    (r) => r.repo.toLowerCase() === target.toLowerCase() || r.key === target.toLowerCase(),
  );
  if (!repository) throw new InvalidIssueReferenceError(text);
  return { repo: repository.repo, number: Number(digits) };
}
