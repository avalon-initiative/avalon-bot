import { describe, expect, it } from 'vitest';
import { renderAdrBody, renderAdrTitle } from '../../../src/render/adr.js';
import { renderBody } from '../../../src/render/issue-body.js';
import { makeRequest, makeSource } from '../../support/fixtures.js';

const decision = (notes: string) =>
  renderBody(
    makeRequest({
      kind: 'decision',
      notes,
      source: makeSource({
        attachments: [{ name: 'diagram.png', url: 'https://cdn.example/diagram.png' }],
      }),
    }),
  );

describe('renderAdrBody', () => {
  it('rewrites a decision into Status, Context, Decision, Consequences and Related', () => {
    const body = renderAdrBody(decision('Adopt option B for reconnects.'), 'Adopt X', 'Carol') ?? '';
    const headings = body.match(/^(# .+|\*\*Status:\*\* .+|## .+)/gm);
    expect(headings).toEqual([
      '# ADR: Adopt X',
      '**Status:** Decided',
      '## Context',
      '## Decision',
      '## Consequences',
      '## Related',
    ]);
    expect(body).toContain('## Decision\n\nAdopt option B for reconnects.');
    expect(body).toContain("> **Alice:** The SDK reconnects, but it doesn't restore guild state.");
    expect(body).toContain('- Discussion: https://discord.com/channels/1/2');
    expect(body).toContain('- Source message: https://discord.com/channels/1/2/3');
    expect(body).toContain('- Filed by: Bob (Discord)');
    expect(body).toContain('- Recorded by: Carol (Discord)');
  });

  it('does not repeat the original headings', () => {
    const body = renderAdrBody(decision('Adopt option B.'), 'Adopt X', 'Carol') ?? '';
    expect(body).not.toMatch(/^# (Decision|Context)/m);
    expect(body).not.toContain('### Source');
    expect(body).not.toContain('### Filed By');
  });

  it('notes when no decision text was recorded', () => {
    expect(renderAdrBody(decision(''), 'Adopt X', 'Carol')).toContain(
      '## Decision\n\n_No decision text was recorded._',
    );
  });

  it('neutralizes mentions in the promoter name', () => {
    expect(renderAdrBody(decision('x'), 'Adopt X', '@everyone')).not.toContain('@everyone');
  });

  it('returns undefined for a body the bot did not write', () => {
    expect(renderAdrBody('Just some text', 'T', 'Carol')).toBeUndefined();
    expect(renderAdrBody('# Decision\n\nno context heading', 'T', 'Carol')).toBeUndefined();
  });
});

describe('renderAdrTitle', () => {
  it.each([
    ['Adopt X', 'ADR: Adopt X'],
    ['[Decision] Adopt X', 'ADR: Adopt X'],
    ['Decision: Adopt X', 'ADR: Adopt X'],
  ])('%s', (title, expected) => {
    expect(renderAdrTitle(title)).toBe(expected);
  });
});
