import type { CreatedIssue } from '../domain/issue.js';

export const RESPONSES = {
  notAuthorized: 'You need a contributor role to file issues from Discord.',
  rateLimited: 'You are filing issues too quickly. Try again in a few minutes.',
  alreadyFiled: 'This message has already been filed or linked to an issue.',
  expired: 'That form expired. Right-click the message and try again.',
  invalidForm: 'Something was missing from the form. Please try again.',
  emptyTitle: 'The title cannot be empty.',
  repoNotAccessible: 'The bot is not installed on that repository. Ask a maintainer to add it.',
  unexpected: 'Something went wrong while filing the issue. Nothing was created.',
  unexpectedLink: 'Something went wrong while linking the issue. Nothing was changed.',
  promoteNotAuthorized: 'Only maintainers can promote a decision to an ADR.',
  promoted: 'Promoted to an ADR and closed.',
  alreadyPromoted: 'That decision is already an ADR.',
  notADecision: 'That is not an open decision filed by the bot, so it cannot be promoted.',
  unexpectedPromote: 'Something went wrong while promoting the decision. Nothing was changed.',
  done: 'Filed.',
  linked: 'Linked.',
  invalidReference:
    'Use an issue URL or `repo#number` for one of the configured repositories, for example `sdks#12`.',
  issueNotFound: 'That issue was not found, or the bot cannot see it.',
} as const;

/** The `<>` around the URL keeps Discord from expanding the link into an embed. */
export function issueCreatedMessage(issue: CreatedIssue): string {
  const note = issue.labelsApplied ? '' : '\n_The label could not be applied and was skipped._';
  return `✅ Ticket **${issue.title}** ([#${String(issue.number)}](<${issue.url}>)) filed${note}`;
}

export function issueLinkedMessage(issue: CreatedIssue): string {
  return `🔗 Ticket **${issue.title}** ([#${String(issue.number)}](<${issue.url}>)) linked`;
}
