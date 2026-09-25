import type { CreatedIssue } from '../domain/issue.js';

export const RESPONSES = {
  notAuthorized: 'You need a contributor role to file issues from Discord.',
  rateLimited: 'You are filing issues too quickly. Try again in a few minutes.',
  alreadyFiled: 'This message has already been filed as an issue.',
  expired: 'That form expired. Right-click the message and try again.',
  invalidForm: 'Something was missing from the form. Please try again.',
  emptyTitle: 'The title cannot be empty.',
  repoNotAccessible: 'The bot is not installed on that repository. Ask a maintainer to add it.',
  unexpected: 'Something went wrong while filing the issue. Nothing was created.',
  done: 'Filed.',
} as const;

/** The `<>` around the URL keeps Discord from expanding the link into an embed. */
export function issueCreatedMessage(issue: CreatedIssue): string {
  const note = issue.labelsApplied ? '' : '\n_The label could not be applied and was skipped._';
  return `✅ Ticket **${issue.title}** ([#${String(issue.number)}](<${issue.url}>)) filed${note}`;
}
