import type { FileIssueRequest } from '../domain/issue.js';
import type { SourceMessage } from '../domain/source-message.js';
import { neutralize, quote, singleLine, truncate } from './sanitize.js';
import { TEMPLATES } from './templates.js';

export const MAX_TITLE_LENGTH = 100;
export const MAX_QUOTED_LENGTH = 4000;
const NO_DETAILS = '_No additional details provided._';

export function renderTitle(rawTitle: string): string {
  return truncate(neutralize(singleLine(rawTitle)), MAX_TITLE_LENGTH);
}

export function renderBody(request: FileIssueRequest): string {
  const { source } = request;
  const template = TEMPLATES[request.kind];
  const notes = request.notes.trim();
  const message = truncate(neutralize(source.content.trim()), MAX_QUOTED_LENGTH);
  const author = neutralize(singleLine(source.authorName));
  const quoted = quote(`**${author}:** ${message.length > 0 ? message : '_(no text content)_'}`);
  const attachments = source.attachments.map((a) => `- [${neutralize(singleLine(a.name))}](${a.url})`);

  const sections = [
    `${template.level} ${template.heading}\n\n${notes.length > 0 ? notes : NO_DETAILS}`,
    `${template.level} ${template.contextHeading}\n\nThis issue was created from a discussion in the Avalon Discord community.\n\n${quoted}`,
    ...(attachments.length > 0 ? [`### Attachments\n\n${attachments.join('\n')}`] : []),
    renderSource(source),
    `### Filed By\n\n${neutralize(singleLine(request.filedBy))} (Discord)`,
  ];
  return `${sections.join('\n\n')}\n`;
}

export function renderSource(source: SourceMessage): string {
  const channel = source.threadName
    ? `#${neutralize(source.channelName)} › ${neutralize(source.threadName)}`
    : `#${neutralize(source.channelName)}`;
  return [
    '### Source',
    '',
    `- Channel: \`${channel}\``,
    `- Sent: ${source.timestamp.toISOString()}`,
    `- Discussion: ${source.discussionUrl}`,
    `- Source message: ${source.messageUrl}`,
  ].join('\n');
}

export function renderLinkComment(source: SourceMessage, linkedBy: string): string {
  return (
    [
      'This issue was linked from a discussion in the Avalon Discord community.',
      renderSource(source),
      `### Linked By\n\n${neutralize(singleLine(linkedBy))} (Discord)`,
    ].join('\n\n') + '\n'
  );
}
