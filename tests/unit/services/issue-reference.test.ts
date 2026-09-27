import { describe, expect, it } from 'vitest';
import { InvalidIssueReferenceError } from '../../../src/domain/errors.js';
import { parseIssueReference } from '../../../src/services/issue-reference.js';
import { makeConfig } from '../../support/fixtures.js';

const { repositories } = makeConfig();

describe('parseIssueReference', () => {
  it.each([
    ['https://github.com/avalon-initiative/avalon-sdks/issues/12', 12],
    ['https://github.com/avalon-initiative/avalon-sdks/pull/34#issuecomment-1', 34],
    ['avalon-initiative/avalon-sdks#56', 56],
    ['AVALON-initiative/avalon-sdks#56', 56],
    ['sdks#78', 78],
    ['  sdks#9  ', 9],
  ])('resolves %s', (input, number) => {
    expect(parseIssueReference(input, repositories)).toEqual({
      repo: 'avalon-initiative/avalon-sdks',
      number,
    });
  });

  it.each([
    'sdks',
    '#12',
    'sdks#',
    'sdks#abc',
    'unknown#1',
    'https://github.com/other-org/other/issues/1',
    'https://example.com/avalon-initiative/avalon-sdks/issues/1',
    'http://github.com/avalon-initiative/avalon-sdks/issues/1',
  ])('rejects %s', (input) => {
    expect(() => parseIssueReference(input, repositories)).toThrow(InvalidIssueReferenceError);
  });
});
