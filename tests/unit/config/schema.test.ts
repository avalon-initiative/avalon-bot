import { describe, expect, it } from 'vitest';
import { parseConfig } from '../../../src/config/load.js';
import { parseEnv } from '../../../src/config/env.js';

const VALID = `
guildId: "111111111111111111"
allowedRoleIds: ["222222222222222222"]
repositories:
  - { key: sdks, name: Avalon SDKs, repo: avalon-initiative/avalon-sdks }
`;

describe('parseConfig', () => {
  it('applies defaults', () => {
    const config = parseConfig(VALID);
    expect(config.labels.bug).toBe('type: bug');
    expect(config.rateLimit).toEqual({ maxRequests: 5, windowSeconds: 600 });
    expect(config.channelDefaults).toEqual({});
  });

  it('rejects non-numeric IDs', () => {
    expect(() => parseConfig(VALID.replace('111111111111111111', 'my-guild'))).toThrow(/guildId/);
  });

  it('rejects an empty role allowlist', () => {
    expect(() => parseConfig(VALID.replace('["222222222222222222"]', '[]'))).toThrow(/allowedRoleIds/);
  });

  it('rejects duplicate repository keys', () => {
    const doubled = `${VALID}  - { key: sdks, name: Again, repo: avalon-initiative/avalon-hub }\n`;
    expect(() => parseConfig(doubled)).toThrow(/unique/);
  });

  it('rejects channel defaults pointing at unknown repositories', () => {
    expect(() => parseConfig(`${VALID}channelDefaults: { "333333333333333333": nope }\n`)).toThrow(
      /unknown repository/,
    );
  });

  it('rejects malformed repository names', () => {
    expect(() => parseConfig(VALID.replace('avalon-initiative/avalon-sdks', 'nope'))).toThrow(/owner\/name/);
  });
});

describe('parseEnv', () => {
  const base = {
    DISCORD_TOKEN: 't',
    DISCORD_APP_ID: 'a',
    GITHUB_APP_ID: '1',
    GITHUB_APP_PRIVATE_KEY_PATH: 'k.pem',
  };

  it('fills defaults', () => {
    const env = parseEnv(base);
    expect(env.CONFIG_PATH).toBe('config.yml');
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('names the missing variables without echoing values', () => {
    expect(() => parseEnv({ DISCORD_TOKEN: 'secret-value' })).toThrow(/DISCORD_APP_ID/);
    expect(() => parseEnv({ DISCORD_TOKEN: 'secret-value' })).not.toThrow(/secret-value/);
  });
});
