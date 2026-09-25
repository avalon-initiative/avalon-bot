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
