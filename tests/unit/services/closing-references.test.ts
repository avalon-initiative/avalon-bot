import { describe, expect, it } from 'vitest';
import { extractClosingReferences } from '../../../src/services/closing-references.js';
import { makeConfig } from '../../support/fixtures.js';

const { repositories } = makeConfig();
const SDKS = 'avalon-initiative/avalon-sdks';
const HUB = 'avalon-initiative/avalon-hub';
const refs = (body: string) => extractClosingReferences(body, SDKS, repositories);

describe('extractClosingReferences', () => {
  it.each(['Closes #12', 'closes #12', 'Fixes #12', 'fixed: #12', 'Resolves #12', 'resolved #12'])(
    'reads %s against the pull request repository',
    (body) => {
      expect(refs(body)).toEqual([{ repo: SDKS, number: 12 }]);
    },
  );

  it('reads cross-repository and URL references', () => {
    expect(
      refs(
        'Closes avalon-initiative/avalon-hub#3\nFixes https://github.com/avalon-initiative/avalon-hub/issues/4',
      ),
    ).toEqual([
      { repo: HUB, number: 3 },
      { repo: HUB, number: 4 },
    ]);
  });

  it('returns each issue once', () => {
    expect(refs('Closes #12\nFixes #12')).toEqual([{ repo: SDKS, number: 12 }]);
  });

  it('ignores repositories outside the config and plain mentions', () => {
    expect(refs('Closes other-org/other#1')).toEqual([]);
    expect(refs('Related to #12, see also #13')).toEqual([]);
    expect(refs('The closes #12 in prose is still a keyword match')).toEqual([{ repo: SDKS, number: 12 }]);
  });

  it('ignores HTML comments such as template hints', () => {
    expect(refs('Closes #<!-- omit only for [noissue] -->\n<!-- Closes #99 -->')).toEqual([]);
  });

  it('does not match keywords inside longer words', () => {
    expect(refs('Discloses #12 and prefixes #13')).toEqual([]);
  });
});
