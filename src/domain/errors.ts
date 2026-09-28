export class UnknownRepositoryError extends Error {
  constructor(readonly repoKey: string) {
    super(`Unknown repository key: ${repoKey}`);
    this.name = 'UnknownRepositoryError';
  }
}

export class InvalidTitleError extends Error {
  constructor() {
    super('The issue title is empty.');
    this.name = 'InvalidTitleError';
  }
}

export class RepositoryNotAccessibleError extends Error {
  constructor(readonly repo: string) {
    super(`The GitHub App cannot access ${repo}.`);
    this.name = 'RepositoryNotAccessibleError';
  }
}

export class InvalidIssueReferenceError extends Error {
  constructor(readonly reference: string) {
    super(`Not an issue reference: ${reference}`);
    this.name = 'InvalidIssueReferenceError';
  }
}

export class IssueNotFoundError extends Error {
  constructor(
    readonly repo: string,
    readonly number: number,
  ) {
    super(`${repo}#${String(number)} was not found.`);
    this.name = 'IssueNotFoundError';
  }
}

export class NotADecisionError extends Error {
  constructor(
    readonly repo: string,
    readonly number: number,
  ) {
    super(`${repo}#${String(number)} is not an open decision filed by the bot.`);
    this.name = 'NotADecisionError';
  }
}

export class AlreadyPromotedError extends Error {
  constructor(
    readonly repo: string,
    readonly number: number,
  ) {
    super(`${repo}#${String(number)} is already an ADR.`);
    this.name = 'AlreadyPromotedError';
  }
}
