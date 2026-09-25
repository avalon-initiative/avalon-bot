import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { configSchema, type AppConfig } from './schema.js';

export function parseConfig(yamlText: string): AppConfig {
  const result = configSchema.safeParse(parse(yamlText));
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid config: ${problems}`);
  }
  return result.data;
}

export async function loadConfig(path: string): Promise<AppConfig> {
  return parseConfig(await readFile(path, 'utf8'));
}
