import { describe, expect, it } from 'vitest';
import {
  renderLinkComment,
  MAX_QUOTED_LENGTH,
  MAX_TITLE_LENGTH,
  renderBody,
  renderTitle,
} from '../../../src/render/issue-body.js';
import { makeRequest, makeSource } from '../../support/fixtures.js';

describe('renderTitle', () => {
  it('collapses whitespace and caps length', () => {
    expect(renderTitle('  a\nb  ')).toBe('a b');
    expect(renderTitle('x'.repeat(500))).toHaveLength(MAX_TITLE_LENGTH);
  });
});

describe('renderBody', () => {
  it('includes the details, the quote, the source links and who filed it', () => {
    const body = renderBody(makeRequest());
    expect(body).toContain('## Problem\n\nHappens after a network drop.');
    expect(body).toContain('> **Alice:** The SDK reconnects');
    expect(body).toContain('- Discussion: https://discord.com/channels/1/2');
    expect(body).toContain('- Source message: https://discord.com/channels/1/2/3');
    expect(body).toContain('- Channel: `#sdk`');
    expect(body).toContain('Bob (Discord)');
  });

  it.each([
    ['bug', '## Problem'],
    ['feature', '## Proposed Feature'],
    ['task', '## Task'],
    ['decision', '# Decision'],
  ] as const)('uses the %s template', (kind, heading) => {
    expect(renderBody(makeRequest({ kind }))).toMatch(new RegExp(`^${heading}\\n`));
  });

  it('notes when no details were given', () => {
    expect(renderBody(makeRequest({ notes: '  ' }))).toContain('_No additional details provided._');
  });

  it('neutralizes mentions, references and HTML in the quoted message and author', () => {
    const body = renderBody(
      makeRequest({
        source: makeSource({ authorName: '@admin', content: 'cc @octocat fixes #9 <b>hi</b>' }),
      }),
    );
    expect(body).not.toMatch(/@octocat|@admin|#9|<b>/);
  });

  it('shows the thread under its channel', () => {
    const body = renderBody(makeRequest({ source: makeSource({ threadName: 'reconnect' }) }));
    expect(body).toContain('`#sdk › reconnect`');
  });

  it('lists attachments', () => {
    const body = renderBody(
      makeRequest({
        source: makeSource({ attachments: [{ name: 'log.txt', url: 'https://cdn.example/log.txt' }] }),
      }),
    );
    expect(body).toContain('- [log.txt](https://cdn.example/log.txt)');
  });

  it('truncates very long messages', () => {
    const body = renderBody(
      makeRequest({ source: makeSource({ content: 'y'.repeat(MAX_QUOTED_LENGTH * 2) }) }),
    );
    expect(body.length).toBeLessThan(MAX_QUOTED_LENGTH + 1500);
  });

  it('handles messages with no text', () => {
    expect(renderBody(makeRequest({ source: makeSource({ content: '' }) }))).toContain('_(no text content)_');
  });
});

describe('renderLinkComment', () => {
  it('carries the source section and who linked it, without quoting the message', () => {
    const body = renderLinkComment(makeSource({ threadName: 'reconnect' }), 'Bob');
    expect(body).toContain('### Source');
    expect(body).toContain('- Channel: `#sdk › reconnect`');
    expect(body).toContain('- Discussion: https://discord.com/channels/1/2');
    expect(body).toContain('### Linked By\n\nBob (Discord)');
    expect(body).not.toContain("doesn't restore");
  });

  it('neutralizes mentions in the linker name', () => {
    expect(renderLinkComment(makeSource(), '@everyone')).not.toContain('@everyone');
  });
});
