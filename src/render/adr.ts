import { neutralize, singleLine } from './sanitize.js';

const NO_DECISION = '_No decision text was recorded._';
const NO_CONSEQUENCES = '_Not recorded yet._';

/** Text between two markers, `# Decision` and `# Context` for a decision the bot filed. */
function between(text: string, start: RegExp, end: RegExp): string | undefined {
  const from = start.exec(text);
  if (!from) return undefined;
  const rest = text.slice(from.index + from[0].length);
  const to = end.exec(rest);
  return (to ? rest.slice(0, to.index) : rest).trim();
}

function line(body: string, label: string): string | undefined {
  return new RegExp(`^- ${label}: (.+)$`, 'm').exec(body)?.[1]?.trim();
}

/**
 * Rewrites a decision issue the bot filed into the organization's ADR shape (Status, Context,
 * Decision, Consequences, Related). Returns undefined when the body is not one of the bot's decisions.
 */
export function renderAdrBody(decisionBody: string, title: string, promotedBy: string): string | undefined {
  const decision = between(decisionBody, /^# Decision\s*$/m, /^# Context\s*$/m);
  const context = between(decisionBody, /^# Context\s*$/m, /^### /m);
  if (decision === undefined || context === undefined) return undefined;

  const discussion = line(decisionBody, 'Discussion');
  const message = line(decisionBody, 'Source message');
  const filedBy = /^### Filed By\s+(.+)$/m.exec(decisionBody)?.[1]?.trim();
  const related = [
    ...(discussion ? [`- Discussion: ${discussion}`] : []),
    ...(message ? [`- Source message: ${message}`] : []),
    ...(filedBy ? [`- Filed by: ${filedBy}`] : []),
    `- Recorded by: ${neutralize(singleLine(promotedBy))} (Discord)`,
  ];

  return [
    `# ${renderAdrTitle(title)}`,
    '**Status:** Decided',
    `## Context\n\n${context}`,
    `## Decision\n\n${decision.length > 0 && !decision.startsWith('_No additional details') ? decision : NO_DECISION}`,
    `## Consequences\n\n${NO_CONSEQUENCES}`,
    `## Related\n\n${related.join('\n')}`,
  ]
    .join('\n\n')
    .concat('\n');
}

export function renderAdrTitle(title: string): string {
  return `ADR: ${title.replace(/^\[?decision\]?:?\s*/i, '').trim()}`;
}
